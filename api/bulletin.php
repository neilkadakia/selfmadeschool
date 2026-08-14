<?php
// Homeroom Bulletin: the teacher pins short notes; every signed-in
// student sees them on the dashboard. Newest first, capped list.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$auth = require_auth();
$all = read_store('bulletin');

if ($method === 'GET') {
    $list = [];
    foreach ($all as $id => $n) {
        $list[] = [
            'id' => $id,
            'text' => $n['text'] ?? '',
            'author' => $n['author'] ?? '',
            'created' => $n['created'] ?? '',
        ];
    }
    usort($list, fn($a, $b) => strcmp($b['created'], $a['created']));
    respond(200, ['ok' => true, 'notes' => array_slice($list, 0, 20)]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);
// Faculty (educator and up) pin and take down notes.
require_rank($auth, ROLE_RANK['educator']);

$in = body_json();
$action = $in['action'] ?? 'post';

if ($action === 'post') {
    $text = trim($in['text'] ?? '');
    if (mb_strlen($text) < 3 || mb_strlen($text) > 500) {
        respond(400, ['error' => 'Keep it between 3 and 500 characters.']);
    }
    $id = bin2hex(random_bytes(8));
    $all[$id] = [
        'text' => $text,
        'author' => $auth['user']['name'] ?? '',
        'created' => gmdate('c'),
    ];
    write_store('bulletin', $all);
    respond(200, ['ok' => true, 'id' => $id]);
}

if ($action === 'delete') {
    $id = (string)($in['id'] ?? '');
    if (!isset($all[$id])) respond(404, ['error' => 'Note not found.']);
    unset($all[$id]);
    write_store('bulletin', $all);
    respond(200, ['ok' => true]);
}

respond(400, ['error' => 'Unknown action.']);
