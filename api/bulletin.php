<?php
// Homeroom Bulletin: the teacher pins short notes; students see them on
// the dashboard. Newest first, capped list.
//
// A note can go to the whole school or to one homeroom, and it can be
// pinned so it stays at the top while the rest scroll past. Students only
// ever receive what was addressed to them; the filtering happens here, not
// in the browser.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

const NOTE_MIN = 3;
const NOTE_MAX = 500;
const SHOWN = 20;

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$auth = require_auth();
$all = read_store('bulletin');
$isFaculty = auth_rank($auth) >= ROLE_RANK['educator'];

if ($method === 'GET') {
    $rooms = read_store('homerooms');
    $mine = $auth['user']['homeroom'] ?? '';
    $today = gmdate('Y-m-d');
    $list = [];
    foreach ($all as $id => $n) {
        $room = (string)($n['homeroom'] ?? '');
        $until = (string)($n['until'] ?? '');
        // Faculty see everything, including notes addressed elsewhere and
        // ones that have already come down, so they can manage the board.
        if (!$isFaculty) {
            if ($room !== '' && $room !== $mine) continue;
            if ($until !== '' && $until < $today) continue;
        }
        $list[] = [
            'id' => $id,
            'text' => $n['text'] ?? '',
            'author' => $n['author'] ?? '',
            'created' => $n['created'] ?? '',
            'pinned' => !empty($n['pinned']),
            'homeroom' => $room,
            'homeroomName' => $room === '' ? '' : ($rooms[$room]['name'] ?? 'a homeroom'),
            'until' => $until,
            'expired' => $until !== '' && $until < $today,
        ];
    }
    // Pinned notes hold the top; everything else is newest first.
    usort($list, function ($a, $b) {
        if ($a['pinned'] !== $b['pinned']) return $a['pinned'] ? -1 : 1;
        return strcmp($b['created'], $a['created']);
    });
    respond(200, ['ok' => true, 'notes' => array_slice($list, 0, SHOWN)]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);
// Faculty (educator and up) pin and take down notes.
require_rank($auth, ROLE_RANK['educator']);

$in = body_json();
$action = $in['action'] ?? 'post';

if ($action === 'post') {
    $text = trim($in['text'] ?? '');
    if (mb_strlen($text) < NOTE_MIN || mb_strlen($text) > NOTE_MAX) {
        respond(400, ['error' => 'Keep it between ' . NOTE_MIN . ' and ' . NOTE_MAX . ' characters.']);
    }
    $homeroom = trim((string)($in['homeroom'] ?? ''));
    if ($homeroom !== '' && !isset(read_store('homerooms')[$homeroom])) {
        respond(404, ['error' => 'No such homeroom.']);
    }
    $until = trim((string)($in['until'] ?? ''));
    if ($until !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $until)) {
        respond(400, ['error' => 'That take-down date does not look right.']);
    }
    $id = bin2hex(random_bytes(8));
    $all[$id] = [
        'text' => $text,
        'author' => $auth['user']['name'] ?? '',
        'by' => $auth['email'],
        'created' => gmdate('c'),
        'pinned' => !empty($in['pinned']),
        'homeroom' => $homeroom,
        'until' => $until,
    ];
    write_store('bulletin', $all);
    respond(200, ['ok' => true, 'id' => $id]);
}

$id = (string)($in['id'] ?? '');
if (!isset($all[$id])) respond(404, ['error' => 'Note not found.']);

if ($action === 'pin' || $action === 'unpin') {
    $all[$id]['pinned'] = $action === 'pin';
    write_store('bulletin', $all);
    respond(200, ['ok' => true]);
}

if ($action === 'delete') {
    unset($all[$id]);
    write_store('bulletin', $all);
    respond(200, ['ok' => true]);
}

respond(400, ['error' => 'Unknown action.']);
