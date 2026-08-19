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

// Mail preferences: nudges on/off. Off means nudge.php skips you entirely.
if ($action === 'set_prefs') {
    $auth = require_auth();
    $users = read_store('users');
    if (!isset($users[$auth['email']])) respond(401, ['error' => 'Account not found.']);
    if (array_key_exists('nudges', $in)) {
        $users[$auth['email']]['nudgesOff'] = !$in['nudges'];
    }
    // Being seen by the rest of the school is a choice, not a default of
    // having signed up. Stored as the opt-out so existing accounts are listed.
    if (array_key_exists('listed', $in)) {
        $users[$auth['email']]['unlisted'] = !$in['listed'];
    }
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

if ($action === 'request_reset') {
    // Always answers ok: no account enumeration. Codes are six digits,
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
            $subject = 'Self Made School: your password reset code';
            $body = "Your reset code is: $code\n\n"
                . "It expires in 15 minutes. Enter it on the sign-in page along with your new password.\n\n"
                . "If you didn't ask for this, you can ignore this email. Your password hasn't changed.";
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
        respond(400, ['error' => 'Code expired or not found. Request a new one.']);
    }
    $entry['tries'] = ($entry['tries'] ?? 0) + 1;
    if ($entry['tries'] > 5) {
        unset($resets[$email]);
        write_store('resets', $resets);
        respond(429, ['error' => 'Too many attempts. Request a new code.']);
    }
    $resets[$email] = $entry;
    write_store('resets', $resets);
    if (!hash_equals($entry['code'], $code)) {
        respond(400, ['error' => 'Wrong code. Check the email and try again.']);
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
    if ($auth['actor'] !== null) respond(400, ['error' => 'Already acting as someone. Return first.']);
    $target = strtolower(trim($in['email'] ?? ''));
    $users = read_users();
    if (!isset($users[$target])) respond(404, ['error' => 'No such account.']);
    if ($target === $auth['email']) respond(400, ['error' => 'That is already you.']);
    if (role_rank($users[$target]['role'] ?? 'student') >= auth_rank($auth)) {
        respond(403, ['error' => 'You can only act as roles below your own.']);
    }
    audit_log($auth, 'act_as', '', $target);
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

// --- deleting your own account ---
//
// The right to leave, and to take everything with you. Apple requires an app
// that creates accounts to offer this from inside the app; the school's own
// privacy promise requires it regardless of Apple.
//
// Every store that keys anything to an email is listed here on purpose. If a
// new store starts holding per-student data, it belongs in this function on
// the same day, or the promise on the privacy page stops being true.
if ($action === 'delete_account') {
    $auth = require_auth();
    $me = $auth['email'];
    // Act As must never be able to delete somebody else's account.
    if (!empty($auth['actor'])) respond(403, ['error' => 'Not while acting as somebody else.']);
    if (($in['confirm'] ?? '') !== 'DELETE') respond(400, ['error' => 'That needs an explicit confirmation.']);

    // The last Global Administrator cannot delete the school out from under
    // itself: there would be nobody left who could let anybody back in.
    $users = read_users();
    if (($users[$me]['role'] ?? '') === 'global_admin') {
        $others = 0;
        foreach ($users as $e => $u) {
            if ($e !== $me && ($u['role'] ?? '') === 'global_admin') $others++;
        }
        if ($others === 0) respond(409, ['error' => 'You are the only Global Administrator. Make somebody else one first.']);
    }

    // The account itself, and its progress blob. The role is read first
    // because the audit row below is written after the record is gone.
    $wasRole = $users[$me]['role'] ?? 'student';
    unset($users[$me]);
    write_store('users', $users);
    write_store('progress_' . sha1($me), []);

    // Every session, so nothing of theirs is still signed in anywhere.
    $tokens = read_store('tokens');
    foreach ($tokens as $t => $e) {
        if (($e['email'] ?? '') === $me) unset($tokens[$t]);
    }
    write_store('tokens', $tokens);

    // Stores keyed directly by email.
    foreach (['notify', 'resets', 'newsletter', 'grants', 'homerooms_members', 'assign_done'] as $name) {
        $st = read_store($name);
        if (isset($st[$me])) {
            unset($st[$me]);
            write_store($name, $st);
        }
    }

    // The Quad: their posts, their reactions on other people's posts, and
    // their comments underneath them.
    $quad = read_store('quad');
    $touched = false;
    foreach ($quad as $id => $post) {
        if (($post['email'] ?? '') === $me) {
            unset($quad[$id]);
            $touched = true;
            continue;
        }
        foreach (($post['reactions'] ?? []) as $kind => $who) {
            if (in_array($me, $who, true)) {
                $quad[$id]['reactions'][$kind] = array_values(array_diff($who, [$me]));
                $touched = true;
            }
        }
        foreach (($post['comments'] ?? []) as $ci => $c) {
            if (($c['email'] ?? '') === $me) {
                unset($quad[$id]['comments'][$ci]);
                $touched = true;
            }
        }
        if ($touched && isset($quad[$id]['comments'])) {
            $quad[$id]['comments'] = array_values($quad[$id]['comments']);
        }
    }
    if ($touched) write_store('quad', $quad);

    // Kudos in both directions.
    $kudos = read_store('kudos');
    $k2 = [];
    foreach ($kudos as $id => $k) {
        if (($k['from'] ?? '') === $me || ($k['to'] ?? '') === $me) continue;
        $k2[$id] = $k;
    }
    if (count($k2) !== count($kudos)) write_store('kudos', $k2);

    // Club rolls.
    $clubs = read_store('clubs');
    $ct = false;
    foreach ($clubs as $id => $c) {
        if (in_array($me, $c['members'] ?? [], true)) {
            $clubs[$id]['members'] = array_values(array_diff($c['members'], [$me]));
            $ct = true;
        }
    }
    if ($ct) write_store('clubs', $clubs);

    // Challenges they joined, and answers they gave to the school's questions.
    foreach ([['challenges', 'joined'], ['forms', 'answers']] as [$name, $field]) {
        $st = read_store($name);
        $t2 = false;
        foreach ($st as $id => $row) {
            if (isset($row[$field][$me])) {
                unset($st[$id][$field][$me]);
                $t2 = true;
            }
        }
        if ($t2) write_store($name, $st);
    }

    // Seats and waitlist places in Office Hours, and any one-on-one they hold.
    $sessions = read_store('sessions');
    $st2 = false;
    foreach ($sessions as $id => $s) {
        foreach (['rsvps', 'waitlist'] as $list) {
            if (in_array($me, $s[$list] ?? [], true)) {
                $sessions[$id][$list] = array_values(array_diff($s[$list], [$me]));
                $st2 = true;
            }
        }
    }
    if ($st2) write_store('sessions', $sessions);

    $booking = read_store('booking');
    $bt = false;
    foreach ($booking as $id => $b) {
        if (($b['takenBy'] ?? '') === $me) {
            $booking[$id]['takenBy'] = '';
            $booking[$id]['topic'] = '';
            $bt = true;
        }
        // A teacher leaving takes their unclaimed offers with them.
        if (($b['educator'] ?? '') === $me) {
            unset($booking[$id]);
            $bt = true;
        }
    }
    if ($bt) write_store('booking', $booking);

    // The audit log keeps THAT an account was deleted, because a school has to
    // be able to answer "where did that student go". It keeps no more than
    // that. audit_log() would stamp the real address into `actor`, which would
    // leave the one copy of them the deletion was supposed to remove, so the
    // row is written by hand with a hash in place of the person.
    $log = read_store('audit');
    $rows = $log['rows'] ?? [];
    // Older rows name this person too: the front office creating the account,
    // a role change, an Act As session. The events stay, because that is what
    // an audit log is for, but the address in them becomes the same hash. What
    // is left says what happened without saying who it was.
    $tag = 'deleted:' . substr(sha1($me), 0, 12);
    foreach ($rows as $i => $row) {
        foreach (['actor', 'as', 'subject'] as $field) {
            if (($row[$field] ?? '') === $me) $rows[$i][$field] = $tag;
        }
    }
    array_unshift($rows, [
        'at' => gmdate('c'),
        'actor' => $tag,
        'as' => '',
        'role' => $wasRole,
        'action' => 'account.deleted',
        'subject' => '',
        'detail' => 'self-service, from the app',
    ]);
    write_store('audit', ['rows' => array_slice($rows, 0, AUDIT_MAX)]);

    respond(200, ['ok' => true]);
}

// --- login ---
$email = strtolower(trim($in['email'] ?? ''));
$password = (string)($in['password'] ?? '');
if ($email === '' || $password === '') respond(400, ['error' => 'Email and password required.']);

$fails = read_store('fails');
$f = $fails[$email] ?? ['n' => 0, 'until' => 0];
if ($f['until'] > time()) {
    respond(429, ['error' => 'Too many attempts. Try again in a few minutes.']);
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
