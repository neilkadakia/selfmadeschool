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
    $name = trim($in['name'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(400, ['error' => 'Valid email required.']);
    if (strlen($password) < 10) respond(400, ['error' => 'Password must be at least 10 characters.']);
    if ($name === '') respond(400, ['error' => 'Name required.']);
    if (isset($users[$email])) respond(409, ['error' => 'Account already exists.']);
    $users[$email] = [
        'name' => $name,
        'role' => ($in['role'] ?? '') === 'admin' ? 'admin' : 'student',
        'hash' => password_hash($password, PASSWORD_DEFAULT),
        'created' => gmdate('c'),
    ];
    write_store('users', $users);
    respond(200, ['ok' => true, 'user' => public_user($email, $users[$email])]);
}

respond(400, ['error' => 'Unknown action.']);
