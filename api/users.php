<?php
// Admin-only account management: list users, create invite accounts.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

$auth = require_auth();
if (($auth['user']['role'] ?? '') !== 'admin') {
    respond(403, ['error' => 'Admin only.']);
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$users = read_store('users');

if ($method === 'GET') {
    $list = [];
    foreach ($users as $email => $u) $list[] = public_user($email, $u);
    respond(200, ['ok' => true, 'users' => $list]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
$action = $in['action'] ?? 'create';

if ($action === 'create') {
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
    if (isset($users[$email])) respond(409, ['error' => 'Account already exists.']);
    $users[$email] = [
        'name' => $name,
        'first' => $first,
        'last' => $last,
        'phone' => $phone,
        'role' => ($in['role'] ?? '') === 'admin' ? 'admin' : 'student',
        'hash' => password_hash($password, PASSWORD_DEFAULT),
        'created' => gmdate('c'),
    ];
    write_store('users', $users);
    respond(200, ['ok' => true, 'user' => public_user($email, $users[$email])]);
}

respond(400, ['error' => 'Unknown action.']);
