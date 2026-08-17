<?php
// Field Work, the other half.
//
// A student files a report: they did the unit's real-world action, and they
// wrote a line about what happened. Until now that line went into the void.
// This is where a teacher reads it and writes back, and where the student
// picks the answer up.
//
// The filings themselves live inside the student's synced progress blob,
// which the browser owns and overwrites wholesale. Replies therefore live
// here, in their own store, keyed by student and unit. A student's next
// sync can never erase what a teacher wrote.
//
//   GET                      a student's own replies (any signed-in account)
//   GET  ?inbox=1            every filing, faculty only, newest first
//   POST action=reply        faculty writes back
//   POST action=seen         the student marks a reply as read
//   POST action=delete       faculty takes a reply back down

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

const REPLY_MIN = 2;
const REPLY_MAX = 1200;

$auth = require_auth();
$isFaculty = auth_rank($auth) >= ROLE_RANK['educator'];
$method = $_SERVER['REQUEST_METHOD'] ?? '';
$replies = read_store('fieldwork');

// ---------- the faculty inbox ----------

if ($method === 'GET' && isset($_GET['inbox'])) {
    require_rank($auth, ROLE_RANK['educator']);
    $users = read_users();
    $titles = course_titles();
    $filter = $_GET['filter'] ?? 'waiting';   // waiting | answered | all
    $rows = [];

    foreach ($users as $email => $u) {
        if (role_rank($u['role'] ?? 'student') >= ROLE_RANK['educator']) continue;
        $state = state_of($email);
        foreach (($state['fieldwork'] ?? []) as $key => $rec) {
            if (!is_array($rec)) continue;
            $note = trim((string)($rec['note'] ?? ''));
            $reply = $replies[$email][$key] ?? null;
            if ($filter === 'waiting' && ($reply !== null || $note === '')) continue;
            if ($filter === 'answered' && $reply === null) continue;
            [$courseSlug, $unitSlug] = array_pad(explode('/', (string)$key, 2), 2, '');
            $unit = catalog_unit($courseSlug, $unitSlug);
            $rows[] = [
                'key' => $key,
                'email' => $email,
                'name' => name_of($users, $email),
                'course' => $courseSlug,
                'courseTitle' => $titles[$courseSlug] ?? $courseSlug,
                'unit' => $unitSlug,
                'unitTitle' => $unit['title'] ?? $unitSlug,
                // The assignment they were answering, so a teacher reading
                // fifty of these doesn't have to remember what was asked.
                'action' => $unit['action'] ?? '',
                'note' => $note,
                'date' => (string)($rec['date'] ?? ''),
                'reply' => $reply === null ? null : [
                    'text' => $reply['text'] ?? '',
                    'by' => $reply['by'] ?? '',
                    'byName' => name_of($users, (string)($reply['by'] ?? '')),
                    'at' => $reply['at'] ?? '',
                    'seen' => !empty($reply['seen']),
                ],
            ];
        }
    }

    // Newest filing first. A blank date sorts last, not first.
    usort($rows, function ($a, $b) {
        if ($a['date'] === $b['date']) return strcmp($a['name'], $b['name']);
        if ($a['date'] === '') return 1;
        if ($b['date'] === '') return -1;
        return strcmp($b['date'], $a['date']);
    });

    // Counts for the tab bar are always all three, whatever the filter.
    $counts = ['waiting' => 0, 'answered' => 0];
    foreach ($users as $email => $u) {
        if (role_rank($u['role'] ?? 'student') >= ROLE_RANK['educator']) continue;
        foreach ((state_of($email)['fieldwork'] ?? []) as $key => $rec) {
            if (!is_array($rec)) continue;
            if (isset($replies[$email][$key])) $counts['answered']++;
            elseif (trim((string)($rec['note'] ?? '')) !== '') $counts['waiting']++;
        }
    }

    respond(200, ['ok' => true, 'filings' => $rows, 'counts' => $counts]);
}

// ---------- a student's own replies ----------

if ($method === 'GET') {
    $mine = $replies[$auth['email']] ?? [];
    $users = read_users();
    $out = [];
    foreach ($mine as $key => $r) {
        $out[$key] = [
            'text' => $r['text'] ?? '',
            'byName' => name_of($users, (string)($r['by'] ?? '')),
            'at' => $r['at'] ?? '',
            'seen' => !empty($r['seen']),
        ];
    }
    respond(200, ['ok' => true, 'replies' => (object)$out]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
$action = $in['action'] ?? '';

// ---------- the student marks a reply read ----------

if ($action === 'seen') {
    $key = (string)($in['key'] ?? '');
    if (!isset($replies[$auth['email']][$key])) respond(404, ['error' => 'No reply there.']);
    $replies[$auth['email']][$key]['seen'] = true;
    write_store('fieldwork', $replies);
    respond(200, ['ok' => true]);
}

// Everything below is faculty.
require_rank($auth, ROLE_RANK['educator']);

$email = strtolower(trim($in['email'] ?? ''));
$key = trim((string)($in['key'] ?? ''));
if ($email === '' || $key === '') respond(400, ['error' => 'Student and unit required.']);

$users = read_users();
if (!isset($users[$email])) respond(404, ['error' => 'No such account.']);

// The unit has to be real, and they have to have actually filed on it.
[$courseSlug, $unitSlug] = array_pad(explode('/', $key, 2), 2, '');
if (catalog_unit($courseSlug, $unitSlug) === null) respond(400, ['error' => 'Unknown unit.']);
$state = state_of($email);
if (!isset($state['fieldwork'][$key])) {
    respond(409, ['error' => 'They have not filed on that unit yet.']);
}

if ($action === 'delete') {
    unset($replies[$email][$key]);
    if (empty($replies[$email])) unset($replies[$email]);
    write_store('fieldwork', $replies);
    audit_log($auth, 'fieldwork.delete', $key, $email);
    respond(200, ['ok' => true]);
}

if ($action !== 'reply') respond(400, ['error' => 'Unknown action.']);

$text = trim((string)($in['text'] ?? ''));
if (mb_strlen($text) < REPLY_MIN || mb_strlen($text) > REPLY_MAX) {
    respond(400, ['error' => 'Keep it between ' . REPLY_MIN . ' and ' . REPLY_MAX . ' characters.']);
}

$existing = $replies[$email][$key] ?? null;
$replies[$email][$key] = [
    'text' => $text,
    'by' => $auth['email'],
    'at' => gmdate('c'),
    // Rewriting a reply the student already read puts it back in front of
    // them: the words changed, so the "new" mark should come back too.
    'seen' => false,
    'first' => $existing['first'] ?? gmdate('c'),
];
write_store('fieldwork', $replies);
audit_log($auth, $existing === null ? 'fieldwork.reply' : 'fieldwork.edit', $key, $email);

// Tell them, if they take mail from the school. A reply on the work they
// did in the real world is worth an interruption; the daily nudge desk is
// deliberately not in the loop here.
if (empty($users[$email]['nudgesOff']) && $existing === null) {
    $unit = catalog_unit($courseSlug, $unitSlug);
    $titles = course_titles();
    $first = trim($users[$email]['first'] ?? '') ?: strtok($users[$email]['name'] ?? 'there', ' ');
    $teacher = $auth['user']['name'] ?? 'The school';
    $unitTitle = $unit['title'] ?? $unitSlug;
    $subject = "$teacher read your Field Work";
    $body = "$first,\n\n"
        . "You filed a Field Work report on $unitTitle ({$titles[$courseSlug]}). "
        . "Somebody read it.\n\n"
        . "$teacher wrote back:\n\n"
        . "  \"$text\"\n\n"
        . "It's waiting on the unit page, and on your Student File under Proof.\n\n"
        . "-- Self Made School\n\n"
        . "You can switch these emails off in your Student File.";
    $headers = "From: Self Made School <noreply@selfmadeschool.org>\r\n"
        . "Content-Type: text/plain; charset=utf-8";
    @mail($email, $subject, $body, $headers);
}

respond(200, [
    'ok' => true,
    'reply' => [
        'text' => $text,
        'by' => $auth['email'],
        'byName' => $auth['user']['name'] ?? '',
        'at' => $replies[$email][$key]['at'],
        'seen' => false,
    ],
]);
