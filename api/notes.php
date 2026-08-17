<?php
// Private faculty notes on a student.
//
// The staff-room notebook: "called on Tuesday, sounded stuck on the budget
// unit", "wants to move to Denver, point at New Cities". Never shown to the
// student, never shown on the Honor Roll, never exported to anything a
// student can reach. Educators and up read all notes; you can only edit or
// tear up your own, unless you are the Global Administrator.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

const NOTE_MIN = 2;
const NOTE_MAX = 2000;

$auth = require_auth();
require_rank($auth, ROLE_RANK['educator']);
$method = $_SERVER['REQUEST_METHOD'] ?? '';
$all = read_store('learner_notes');
$users = read_users();

if ($method === 'GET') {
    $email = strtolower(trim($_GET['email'] ?? ''));
    if (!isset($users[$email])) respond(404, ['error' => 'No such account.']);
    $rows = [];
    foreach (($all[$email] ?? []) as $id => $n) {
        $rows[] = [
            'id' => $id,
            'text' => $n['text'] ?? '',
            'by' => $n['by'] ?? '',
            'byName' => name_of($users, (string)($n['by'] ?? '')),
            'at' => $n['at'] ?? '',
            'edited' => $n['edited'] ?? '',
            'mine' => ($n['by'] ?? '') === $auth['email'],
        ];
    }
    usort($rows, fn($a, $b) => strcmp($b['at'], $a['at']));
    respond(200, ['ok' => true, 'notes' => $rows]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
$action = $in['action'] ?? 'write';

if ($action === 'write') {
    $email = strtolower(trim($in['email'] ?? ''));
    $text = trim((string)($in['text'] ?? ''));
    if (!isset($users[$email])) respond(404, ['error' => 'No such account.']);
    if (mb_strlen($text) < NOTE_MIN || mb_strlen($text) > NOTE_MAX) {
        respond(400, ['error' => 'Keep it between ' . NOTE_MIN . ' and ' . NOTE_MAX . ' characters.']);
    }
    $id = bin2hex(random_bytes(8));
    $all[$email][$id] = [
        'text' => $text,
        'by' => $auth['email'],
        'at' => gmdate('c'),
        'edited' => '',
    ];
    write_store('learner_notes', $all);
    audit_log($auth, 'note.write', mb_substr($text, 0, 60), $email);
    respond(200, [
        'ok' => true,
        'note' => [
            'id' => $id,
            'text' => $text,
            'by' => $auth['email'],
            'byName' => $auth['user']['name'] ?? '',
            'at' => $all[$email][$id]['at'],
            'edited' => '',
            'mine' => true,
        ],
    ]);
}

// Edit and delete both need to find the note first.
$email = strtolower(trim($in['email'] ?? ''));
$id = (string)($in['id'] ?? '');
$note = $all[$email][$id] ?? null;
if ($note === null) respond(404, ['error' => 'Note not found.']);
if (($note['by'] ?? '') !== $auth['email'] && auth_rank($auth) < ROLE_RANK['global_admin']) {
    respond(403, ['error' => 'Only the person who wrote a note can change it.']);
}

if ($action === 'edit') {
    $text = trim((string)($in['text'] ?? ''));
    if (mb_strlen($text) < NOTE_MIN || mb_strlen($text) > NOTE_MAX) {
        respond(400, ['error' => 'Keep it between ' . NOTE_MIN . ' and ' . NOTE_MAX . ' characters.']);
    }
    $all[$email][$id]['text'] = $text;
    $all[$email][$id]['edited'] = gmdate('c');
    write_store('learner_notes', $all);
    respond(200, ['ok' => true]);
}

if ($action === 'delete') {
    unset($all[$email][$id]);
    if (empty($all[$email])) unset($all[$email]);
    write_store('learner_notes', $all);
    audit_log($auth, 'note.delete', $id, $email);
    respond(200, ['ok' => true]);
}

respond(400, ['error' => 'Unknown action.']);
