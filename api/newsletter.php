<?php
// Newsletter list: public subscribe, admin-only export.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    $auth = require_auth();
    require_rank($auth, ROLE_RANK['admin']);
    $subs = read_store('newsletter');
    $list = [];
    foreach ($subs as $email => $s) {
        $list[] = ['email' => $email, 'created' => $s['created'] ?? '', 'source' => $s['source'] ?? ''];
    }
    respond(200, ['ok' => true, 'count' => count($list), 'subscribers' => $list]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();

// Honeypot: real people never fill this field. Pretend success for bots.
if (trim($in['school'] ?? '') !== '') respond(200, ['ok' => true]);

$email = strtolower(trim($in['email'] ?? ''));
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
    respond(400, ['error' => 'That email does not look right.']);
}

$subs = read_store('newsletter');
if (isset($subs[$email])) {
    respond(200, ['ok' => true, 'already' => true]);
}
if (count($subs) >= 100000) respond(503, ['error' => 'List is full.']);

$subs[$email] = [
    'created' => gmdate('c'),
    'source' => substr(trim($in['source'] ?? 'home'), 0, 40),
];
write_store('newsletter', $subs);

respond(200, ['ok' => true]);
