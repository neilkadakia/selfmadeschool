<?php
// The bell: what happened while you were gone.
//
// Read-only from the student's side apart from marking things read. Nothing
// here is written by the client; every line was put there by whatever action
// caused it, which is why a notification can never claim something that did
// not happen.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

$auth = require_auth();
$me = $auth['email'];
$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    $mine = read_store('notify')[$me] ?? [];
    $unread = 0;
    foreach ($mine as $n) if (empty($n['read'])) $unread++;
    respond(200, ['ok' => true, 'notes' => array_slice($mine, 0, 40), 'unread' => $unread]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
$action = (string)($in['action'] ?? '');
$all = read_store('notify');
$mine = $all[$me] ?? [];

if ($action === 'read') {
    $id = (string)($in['id'] ?? '');
    foreach ($mine as $i => $n) {
        if (($n['id'] ?? '') === $id) $mine[$i]['read'] = true;
    }
    $all[$me] = $mine;
    write_store('notify', $all);
    respond(200, ['ok' => true]);
}

if ($action === 'read-all') {
    foreach ($mine as $i => $n) $mine[$i]['read'] = true;
    $all[$me] = $mine;
    write_store('notify', $all);
    respond(200, ['ok' => true]);
}

if ($action === 'clear') {
    unset($all[$me]);
    write_store('notify', $all);
    respond(200, ['ok' => true]);
}

respond(400, ['error' => 'Unknown action.']);
