<?php
// The Register: who else is in this school, and the kudos they have been
// handed by the people learning beside them.
//
// Two rules hold here. Emails never cross to a student, so the directory is
// names and numbers and nothing a stranger could write to. And being listed
// is a choice: anybody can take themselves out of it from the Locker without
// losing anything else.
//
// Kudos are their own currency rather than XP. XP lives in the progress blob
// the browser owns and overwrites wholesale on every sync, so a server-side
// grant would not survive the next save. Kudos are counted here instead.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

const KUDOS_NOTE_MAX = 140;
const KUDOS_PER_DAY = 5;

$auth = require_auth();
$isFaculty = auth_rank($auth) >= ROLE_RANK['educator'];
$me = $auth['email'];
$method = $_SERVER['REQUEST_METHOD'] ?? '';

// Kudos received, by email.
function kudos_counts(array $kudos): array {
    $out = [];
    foreach ($kudos as $k) {
        $to = (string)($k['to'] ?? '');
        if ($to === '') continue;
        $out[$to] = ($out[$to] ?? 0) + 1;
    }
    return $out;
}

if ($method === 'GET') {
    $users = read_users();
    $kudos = read_store('kudos');
    $counts = kudos_counts($kudos);
    $clubs = read_store('clubs');

    // Which clubs each person is in, for the "we are in the same room" line.
    $clubsOf = [];
    foreach ($clubs as $id => $c) {
        foreach ($c['members'] ?? [] as $email) {
            $clubsOf[$email][] = $c['name'] ?? $id;
        }
    }

    $rows = [];
    foreach ($users as $email => $u) {
        $isMe = $email === $me;
        // Faculty are listed as faculty; unlisted students are not listed at
        // all, except to themselves.
        if (!empty($u['unlisted']) && !$isMe) continue;
        $state = state_of($email);
        $done = 0;
        foreach (($state['done'] ?? []) as $list) $done += count($list);
        $row = [
            'name' => name_of($users, $email),
            'role' => $u['role'] ?? 'student',
            'xp' => (int)($state['xp'] ?? 0),
            'streak' => (int)($state['streak']['count'] ?? 0),
            'units' => $done,
            'kudos' => $counts[$email] ?? 0,
            'clubs' => array_slice($clubsOf[$email] ?? [], 0, 4),
            'homeroom' => $u['homeroom'] ?? '',
            'you' => $isMe,
            'unlisted' => !empty($u['unlisted']),
        ];
        // The handle is how one student hands another kudos without ever
        // seeing an email address.
        $row['handle'] = substr(sha1($email . '|register'), 0, 12);
        if ($isFaculty) $row['email'] = $email;
        $rows[] = $row;
    }
    // Most-carried first, then alphabetical, so the room has a shape.
    usort($rows, function ($a, $b) {
        if ($a['xp'] !== $b['xp']) return $b['xp'] <=> $a['xp'];
        return strcasecmp($a['name'], $b['name']);
    });

    // The kudos this person has been handed, with a note and a date.
    $yours = [];
    foreach ($kudos as $k) {
        if (($k['to'] ?? '') !== $me) continue;
        $yours[] = [
            'from' => name_of($users, (string)($k['from'] ?? '')),
            'note' => $k['note'] ?? '',
            'at' => $k['at'] ?? '',
        ];
    }
    usort($yours, fn($a, $b) => strcmp((string)$b['at'], (string)$a['at']));

    respond(200, [
        'ok' => true,
        'people' => $rows,
        'kudos' => array_slice($yours, 0, 30),
        'listed' => empty($users[$me]['unlisted']),
    ]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
$action = (string)($in['action'] ?? '');

if ($action === 'kudos') {
    $handle = (string)($in['handle'] ?? '');
    $note = trim((string)($in['note'] ?? ''));
    if (mb_strlen($note) > KUDOS_NOTE_MAX) {
        respond(400, ['error' => 'Keep it under ' . KUDOS_NOTE_MAX . ' characters.']);
    }
    // Resolve the handle back to an account without ever having sent the
    // email to the browser in the first place.
    $users = read_users();
    $to = null;
    foreach ($users as $email => $u) {
        if (substr(sha1($email . '|register'), 0, 12) === $handle) { $to = $email; break; }
    }
    if ($to === null) respond(404, ['error' => 'No such person.']);
    if ($to === $me) respond(400, ['error' => 'Kudos are for somebody else.']);
    if (!empty($users[$to]['unlisted'])) respond(403, ['error' => 'That person is not in the register.']);

    $kudos = read_store('kudos');
    $today = gmdate('Y-m-d');
    $mineToday = 0;
    foreach ($kudos as $k) {
        if (($k['from'] ?? '') !== $me) continue;
        // One each per person, ever: kudos mean nothing if they can be farmed.
        if (($k['to'] ?? '') === $to) respond(400, ['error' => 'You have already given them kudos.']);
        if (str_starts_with((string)($k['at'] ?? ''), $today)) $mineToday++;
    }
    if ($mineToday >= KUDOS_PER_DAY) {
        respond(429, ['error' => 'That is your kudos for today. Spend them like they count.']);
    }
    $kudos[bin2hex(random_bytes(8))] = [
        'from' => $me,
        'to' => $to,
        'note' => $note,
        'at' => gmdate('c'),
    ];
    write_store('kudos', $kudos);
    notify(
        $to,
        'kudos',
        name_of($users, $me) . ' gave you kudos' . ($note !== '' ? ': "' . $note . '"' : '.'),
        '/learn/register/'
    );
    respond(200, ['ok' => true]);
}

respond(400, ['error' => 'Unknown action.']);
