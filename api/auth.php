<?php
// Login / logout / whoami. Failed logins are rate-limited per email.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    $auth = require_auth();
    respond(200, [
        'ok' => true,
        'user' => public_user($auth['email'], $auth['user']),
        'actor' => $auth['actor'],
    ]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
$action = $in['action'] ?? 'login';

if ($action === 'update_profile') {
    $auth = require_auth();
    $users = read_store('users');
    if (!isset($users[$auth['email']])) respond(401, ['error' => 'Account not found.']);
    $u = $users[$auth['email']];
    if (isset($in['first']) || isset($in['last'])) {
        $first = trim($in['first'] ?? '');
        $last = trim($in['last'] ?? '');
        if ($first === '' || mb_strlen($first) > 40) respond(400, ['error' => 'First name must be 1-40 characters.']);
        if ($last === '' || mb_strlen($last) > 40) respond(400, ['error' => 'Last name must be 1-40 characters.']);
        $u['first'] = $first;
        $u['last'] = $last;
        $u['name'] = $first . ' ' . $last;
    } elseif (isset($in['name'])) {
        // Legacy single-field rename, kept for older clients.
        $name = trim($in['name']);
        if ($name === '' || mb_strlen($name) > 60) respond(400, ['error' => 'Name must be 1-60 characters.']);
        $u['name'] = $name;
    }
    if (array_key_exists('phone', $in)) {
        $phone = clean_phone((string)$in['phone']);
        if ($phone === null) respond(400, ['error' => 'That phone number does not look right.']);
        $u['phone'] = $phone;
    }
    if (array_key_exists('dob', $in)) {
        $dob = clean_dob((string)$in['dob']);
        if ($dob === null) respond(400, ['error' => 'That birthday does not look right.']);
        $u['dob'] = $dob;
    }
    $users[$auth['email']] = $u;
    write_store('users', $users);
    respond(200, ['ok' => true, 'user' => public_user($auth['email'], $u)]);
}

if ($action === 'change_password') {
    $auth = require_auth();
    $current = (string)($in['current'] ?? '');
    $next = (string)($in['next'] ?? '');
    if (strlen($next) < 10) respond(400, ['error' => 'New password must be at least 10 characters.']);
    $users = read_store('users');
    $user = $users[$auth['email']] ?? null;
    if (!$user || !password_verify($current, $user['hash'] ?? '')) {
        respond(401, ['error' => 'Current password is wrong.']);
    }
    $users[$auth['email']]['hash'] = password_hash($next, PASSWORD_DEFAULT);
    write_store('users', $users);
    respond(200, ['ok' => true]);
}

if ($action === 'request_reset') {
    // Always answers ok — no account enumeration. Codes are six digits,
    // live 15 minutes, and re-requests inside 60s are silently ignored.
    $email = strtolower(trim($in['email'] ?? ''));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(200, ['ok' => true]);
    $users = read_store('users');
    if (isset($users[$email])) {
        $resets = read_store('resets');
        $entry = $resets[$email] ?? null;
        if (!$entry || ($entry['sent'] ?? 0) < time() - 60) {
            $code = (string)random_int(100000, 999999);
            $resets[$email] = [
                'code' => $code,
                'exp' => time() + 15 * 60,
                'tries' => 0,
                'sent' => time(),
            ];
            write_store('resets', $resets);
            $subject = 'Self Made School — your password reset code';
            $body = "Your reset code is: $code\n\n"
                . "It expires in 15 minutes. Enter it on the sign-in page along with your new password.\n\n"
                . "If you didn't ask for this, you can ignore this email — your password hasn't changed.";
            $headers = "From: Self Made School <noreply@selfmadeschool.org>\r\n"
                . "Content-Type: text/plain; charset=utf-8";
            @mail($email, $subject, $body, $headers);
        }
    }
    respond(200, ['ok' => true]);
}

if ($action === 'reset_password') {
    $email = strtolower(trim($in['email'] ?? ''));
    $code = trim((string)($in['code'] ?? ''));
    $next = (string)($in['next'] ?? '');
    if (strlen($next) < 10) respond(400, ['error' => 'New password must be at least 10 characters.']);
    $resets = read_store('resets');
    $entry = $resets[$email] ?? null;
    if (!$entry || ($entry['exp'] ?? 0) < time()) {
        respond(400, ['error' => 'Code expired or not found — request a new one.']);
    }
    $entry['tries'] = ($entry['tries'] ?? 0) + 1;
    if ($entry['tries'] > 5) {
        unset($resets[$email]);
        write_store('resets', $resets);
        respond(429, ['error' => 'Too many attempts — request a new code.']);
    }
    $resets[$email] = $entry;
    write_store('resets', $resets);
    if (!hash_equals($entry['code'], $code)) {
        respond(400, ['error' => 'Wrong code — check the email and try again.']);
    }
    $users = read_store('users');
    if (!isset($users[$email])) respond(400, ['error' => 'Account not found.']);
    $users[$email]['hash'] = password_hash($next, PASSWORD_DEFAULT);
    write_store('users', $users);
    unset($resets[$email]);
    write_store('resets', $resets);
    // Every existing session dies with the old password.
    $tokens = read_store('tokens');
    foreach ($tokens as $t => $e) {
        if (($e['email'] ?? '') === $email) unset($tokens[$t]);
    }
    write_store('tokens', $tokens);
    respond(200, ['ok' => true]);
}

if ($action === 'impersonate') {
    // Act As: administrators and above may work as a lower-ranked account.
    // The issued session is short-lived and remembers who is really driving.
    $auth = require_auth();
    require_rank($auth, ROLE_RANK['admin']);
    if ($auth['actor'] !== null) respond(400, ['error' => 'Already acting as someone — return first.']);
    $target = strtolower(trim($in['email'] ?? ''));
    $users = read_users();
    if (!isset($users[$target])) respond(404, ['error' => 'No such account.']);
    if ($target === $auth['email']) respond(400, ['error' => 'That is already you.']);
    if (role_rank($users[$target]['role'] ?? 'student') >= auth_rank($auth)) {
        respond(403, ['error' => 'You can only act as roles below your own.']);
    }
    respond(200, [
        'ok' => true,
        'token' => issue_token($target, $auth['email'], IMPERSONATE_TTL),
        'user' => public_user($target, $users[$target]),
    ]);
}

if ($action === 'logout') {
    $token = bearer_token();
    if ($token !== '') {
        $tokens = read_store('tokens');
        unset($tokens[$token]);
        write_store('tokens', $tokens);
    }
    respond(200, ['ok' => true]);
}

// --- login ---
$email = strtolower(trim($in['email'] ?? ''));
$password = (string)($in['password'] ?? '');
if ($email === '' || $password === '') respond(400, ['error' => 'Email and password required.']);

$fails = read_store('fails');
$f = $fails[$email] ?? ['n' => 0, 'until' => 0];
if ($f['until'] > time()) {
    respond(429, ['error' => 'Too many attempts — try again in a few minutes.']);
}

usleep(250000); // flat cost on every attempt

$users = read_users();
$user = $users[$email] ?? null;
$ok = $user && password_verify($password, $user['hash'] ?? '');

if (!$ok) {
    $f['n']++;
    if ($f['n'] >= LOCKOUT_ATTEMPTS) {
        $f = ['n' => 0, 'until' => time() + LOCKOUT_SECONDS];
    }
    $fails[$email] = $f;
    write_store('fails', $fails);
    respond(401, ['error' => 'Wrong email or password.']);
}

unset($fails[$email]);
write_store('fails', $fails);

respond(200, [
    'ok' => true,
    'token' => issue_token($email),
    'user' => public_user($email, $user),
]);
