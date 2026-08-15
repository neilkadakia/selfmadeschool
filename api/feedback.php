<?php
// Student quotes: signed-in students submit one honest line; admin
// approves; the public homepage shows approved quotes only.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    $all = read_store('feedback');
    // Administrators and up see everything; the public sees approved only.
    $isAdmin = false;
    if (bearer_token() !== '') {
        $tokens = read_store('tokens');
        $entry = $tokens[bearer_token()] ?? null;
        if ($entry && ($entry['exp'] ?? 0) >= time()) {
            $users = read_users();
            $isAdmin = role_rank($users[$entry['email']]['role'] ?? '') >= ROLE_RANK['admin'];
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
            'rating' => (int)($q['rating'] ?? 0),
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
    // Optional star rating (1–5); 0 means "not given".
    $rating = $in['rating'] ?? 0;
    if (!is_int($rating) || $rating < 0 || $rating > 5) {
        respond(400, ['error' => 'Rating must be 1 to 5.']);
    }
    $id = bin2hex(random_bytes(8));
    $all[$id] = [
        'email' => $auth['email'],
        'name' => $auth['user']['name'] ?? '',
        'text' => $text,
        'context' => substr(trim($in['context'] ?? ''), 0, 80),
        'rating' => $rating,
        'created' => gmdate('c'),
        'approved' => false,
    ];
    write_store('feedback', $all);
    respond(200, ['ok' => true, 'id' => $id]);
}

// Moderation is for administrators and up.
require_rank($auth, ROLE_RANK['admin']);
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
