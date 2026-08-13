<?php
// One-time bootstrap: creates the first (admin) account, then goes dead.
// Only works while zero users exist — after that, use users.php as admin.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['error' => 'POST only.']);
}

$users = read_store('users');
if (count($users) > 0) {
    respond(403, ['error' => 'Setup already completed.']);
}

$in = body_json();
$email = strtolower(trim($in['email'] ?? ''));
$password = (string)($in['password'] ?? '');
$name = trim($in['name'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(400, ['error' => 'Valid email required.']);
if (strlen($password) < 10) respond(400, ['error' => 'Password must be at least 10 characters.']);
if ($name === '') respond(400, ['error' => 'Name required.']);

$users[$email] = [
    'name' => $name,
    'role' => 'admin',
    'hash' => password_hash($password, PASSWORD_DEFAULT),
    'created' => gmdate('c'),
];
write_store('users', $users);

respond(200, ['ok' => true, 'user' => public_user($email, $users[$email])]);
