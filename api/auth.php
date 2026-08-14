<?php
// Login / logout / whoami. Failed logins are rate-limited per email.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    $auth = require_auth();
    respond(200, ['ok' => true, 'user' => public_user($auth['email'], $auth['user'])]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
$action = $in['action'] ?? 'login';

if ($action === 'update_profile') {
    $auth = require_auth();
    $name = trim($in['name'] ?? '');
    if ($name === '' || mb_strlen($name) > 60) respond(400, ['error' => 'Name must be 1-60 characters.']);
    $users = read_store('users');
    if (!isset($users[$auth['email']])) respond(401, ['error' => 'Account not found.']);
    $users[$auth['email']]['name'] = $name;
    write_store('users', $users);
    respond(200, ['ok' => true, 'user' => public_user($auth['email'], $users[$auth['email']])]);
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

$users = read_store('users');
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
