<?php
// Student quotes: signed-in students submit one honest line; admin
// approves; the public homepage shows approved quotes only.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    $all = read_store('feedback');
    // Admin with a valid token sees everything; the public sees approved only.
    $isAdmin = false;
    if (bearer_token() !== '') {
        $tokens = read_store('tokens');
        $entry = $tokens[bearer_token()] ?? null;
        if ($entry && ($entry['exp'] ?? 0) >= time()) {
            $users = read_store('users');
            $isAdmin = (($users[$entry['email']]['role'] ?? '') === 'admin');
        }
    }
    $list = [];
    foreach ($all as $id => $q) {
        if (!$isAdmin && empty($q['approved'])) continue;
        $row = [
            'id' => $id,
            'text' => $q['text'] ?? '',
            'name' => $q['name'] ?? '',
            'context' => $q['context'] ?? '',
            'created' => $q['created'] ?? '',
            'approved' => (bool)($q['approved'] ?? false),
        ];
        if ($isAdmin) $row['email'] = $q['email'] ?? '';
        $list[] = $row;
    }
    usort($list, fn($a, $b) => strcmp($b['created'], $a['created']));
    if (!$isAdmin) $list = array_slice($list, 0, 12);
    respond(200, ['ok' => true, 'quotes' => $list]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$auth = require_auth();
$in = body_json();
$action = $in['action'] ?? 'submit';
$all = read_store('feedback');

if ($action === 'submit') {
    $text = trim($in['text'] ?? '');
    if (mb_strlen($text) < 10 || mb_strlen($text) > 300) {
        respond(400, ['error' => 'Keep it between 10 and 300 characters.']);
    }
    $id = bin2hex(random_bytes(8));
    $all[$id] = [
        'email' => $auth['email'],
        'name' => $auth['user']['name'] ?? '',
        'text' => $text,
        'context' => substr(trim($in['context'] ?? ''), 0, 80),
        'created' => gmdate('c'),
        'approved' => false,
    ];
    write_store('feedback', $all);
    respond(200, ['ok' => true, 'id' => $id]);
}

// Moderation is admin-only.
if (($auth['user']['role'] ?? '') !== 'admin') respond(403, ['error' => 'Admin only.']);
$id = (string)($in['id'] ?? '');
if (!isset($all[$id])) respond(404, ['error' => 'Quote not found.']);

if ($action === 'approve') {
    $all[$id]['approved'] = true;
} elseif ($action === 'unapprove') {
    $all[$id]['approved'] = false;
} elseif ($action === 'delete') {
    unset($all[$id]);
} else {
    respond(400, ['error' => 'Unknown action.']);
}
write_store('feedback', $all);
respond(200, ['ok' => true]);
