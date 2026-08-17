<?php
// Faculty account management. Educators and up can read the roster;
// administrators and up create accounts (only below their own rank);
// only the Global Administrator changes roles.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

$auth = require_auth();
require_rank($auth, ROLE_RANK['educator']);

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$users = read_users();

if ($method === 'GET') {
    $list = [];
    foreach ($users as $email => $u) $list[] = public_user($email, $u);
    respond(200, ['ok' => true, 'users' => $list]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
$action = $in['action'] ?? 'create';

if ($action === 'set_role') {
    require_rank($auth, ROLE_RANK['global_admin']);
    $target = strtolower(trim($in['email'] ?? ''));
    $role = (string)($in['role'] ?? '');
    if (!isset($users[$target])) respond(404, ['error' => 'No such account.']);
    if ($target === $auth['email']) respond(400, ['error' => 'You cannot change your own role.']);
    if (($users[$target]['role'] ?? '') === 'global_admin') {
        respond(400, ['error' => 'There is exactly one Global Administrator.']);
    }
    if (!in_array($role, ['student', 'educator', 'admin'], true)) {
        respond(400, ['error' => 'Role must be student, educator, or admin.']);
    }
    $was = $users[$target]['role'] ?? 'student';
    $users[$target]['role'] = $role;
    write_store('users', $users);
    audit_log($auth, 'role.change', "$was -> $role", $target);
    respond(200, ['ok' => true, 'user' => public_user($target, $users[$target])]);
}

if ($action === 'create') {
    require_rank($auth, ROLE_RANK['admin']);
    $email = strtolower(trim($in['email'] ?? ''));
    $password = (string)($in['password'] ?? '');
    $first = trim($in['first'] ?? '');
    $last = trim($in['last'] ?? '');
    $name = trim($in['name'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(400, ['error' => 'Valid email required.']);
    if (strlen($password) < 10) respond(400, ['error' => 'Password must be at least 10 characters.']);
    if ($first !== '' || $last !== '') {
        if ($first === '' || $last === '' || mb_strlen($first) > 40 || mb_strlen($last) > 40) {
            respond(400, ['error' => 'First and last name required (40 characters max each).']);
        }
        $name = $first . ' ' . $last;
    }
    if ($name === '') respond(400, ['error' => 'Name required.']);
    $phone = clean_phone((string)($in['phone'] ?? ''));
    if ($phone === null) respond(400, ['error' => 'That phone number does not look right.']);
    $dob = clean_dob((string)($in['dob'] ?? ''));
    if ($dob === null) respond(400, ['error' => 'That birthday does not look right.']);
    if (isset($users[$email])) respond(409, ['error' => 'Account already exists.']);
    $role = (string)($in['role'] ?? 'student');
    if ($role === '') $role = 'student';
    if (!in_array($role, ['student', 'educator', 'admin'], true)) {
        respond(400, ['error' => 'Role must be student, educator, or admin.']);
    }
    // You can only create accounts strictly below your own rank.
    if (role_rank($role) >= auth_rank($auth)) {
        respond(403, ['error' => 'You can only create roles below your own.']);
    }
    $users[$email] = [
        'name' => $name,
        'first' => $first,
        'last' => $last,
        'phone' => $phone,
        'dob' => $dob,
        'role' => $role,
        'hash' => password_hash($password, PASSWORD_DEFAULT),
        'created' => gmdate('c'),
        // New accounts start on the school's default plan. While the school
        // is free that plan opens everything, so this is inert until the
        // day somebody turns payment on.
        'plan' => read_settings()['defaultPlan'] ?? '',
        'homeroom' => '',
    ];
    write_store('users', $users);
    audit_log($auth, 'account.create', $role, $email);
    respond(200, ['ok' => true, 'user' => public_user($email, $users[$email])]);
}

respond(400, ['error' => 'Unknown action.']);
