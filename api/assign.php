<?php
// Assignments: a teacher pointing a student at something specific.
//
// "Start with Renters Insurance before you sit the money final." It lands on
// the student's desk with the teacher's name on it and a note in their own
// words. The student marks it done, or it completes itself when they finish
// the unit.
//
// Whether an assignment can carry a DUE DATE is a school setting
// (features.deadlines). With deadlines off, this is an invitation: no
// clock, no overdue flag, nothing that turns a free self-paced school into
// homework. With them on, the same object grows a date and the Gradebook
// starts flagging what has slipped. One mechanism either way.
//
//   GET                     the caller's own assignments
//   GET  ?email=            one student's, faculty only
//   GET  ?all=1             every open assignment, faculty only
//   POST action=assign      faculty gives one out
//   POST action=done        the student (or faculty) closes it
//   POST action=reopen      undo that
//   POST action=delete      faculty withdraws it

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

const NOTE_MAX = 400;

$auth = require_auth();
$isFaculty = auth_rank($auth) >= ROLE_RANK['educator'];
$method = $_SERVER['REQUEST_METHOD'] ?? '';
$all = read_store('assignments');
$users = read_users();
$titles = course_titles();
$deadlines = !empty(read_settings()['features']['deadlines']);

// An assignment is overdue only when the school runs on deadlines, the date
// has passed, and it is still open.
function decorate(array $a, string $id, array $users, array $titles, bool $deadlines): array {
    $unit = ($a['unit'] ?? '') === '' ? null : catalog_unit((string)$a['course'], (string)$a['unit']);
    $due = (string)($a['due'] ?? '');
    $overdue = $deadlines && $due !== '' && empty($a['done']) && $due < gmdate('Y-m-d');
    return [
        'id' => $id,
        'course' => $a['course'] ?? '',
        'courseTitle' => $titles[$a['course'] ?? ''] ?? '',
        'unit' => $a['unit'] ?? '',
        'unitTitle' => $unit['title'] ?? '',
        'note' => $a['note'] ?? '',
        'due' => $deadlines ? $due : '',
        'overdue' => $overdue,
        'by' => $a['by'] ?? '',
        'byName' => name_of($users, (string)($a['by'] ?? '')),
        'created' => $a['created'] ?? '',
        'done' => !empty($a['done']),
        'doneAt' => $a['doneAt'] ?? '',
    ];
}

if ($method === 'GET') {
    if (isset($_GET['all'])) {
        require_rank($auth, ROLE_RANK['educator']);
        $rows = [];
        foreach ($all as $email => $list) {
            foreach ($list as $id => $a) {
                $rows[] = ['email' => $email, 'name' => name_of($users, $email)]
                    + decorate($a, $id, $users, $titles, $deadlines);
            }
        }
        usort($rows, fn($a, $b) => strcmp($b['created'], $a['created']));
        respond(200, ['ok' => true, 'assignments' => $rows, 'deadlines' => $deadlines]);
    }

    $email = strtolower(trim($_GET['email'] ?? '')) ?: $auth['email'];
    if ($email !== $auth['email']) require_rank($auth, ROLE_RANK['educator']);
    $rows = [];
    foreach (($all[$email] ?? []) as $id => $a) {
        $rows[] = decorate($a, $id, $users, $titles, $deadlines);
    }
    usort($rows, function ($a, $b) {
        // Open before closed, then soonest due, then newest.
        if ($a['done'] !== $b['done']) return $a['done'] ? 1 : -1;
        if ($a['due'] !== $b['due'] && $a['due'] !== '' && $b['due'] !== '') return strcmp($a['due'], $b['due']);
        return strcmp($b['created'], $a['created']);
    });
    respond(200, ['ok' => true, 'assignments' => $rows, 'deadlines' => $deadlines]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
$action = $in['action'] ?? '';

if ($action === 'assign') {
    require_rank($auth, ROLE_RANK['educator']);
    // One assignment can go to a whole homeroom at once.
    $targets = [];
    if (isset($in['homeroom']) && trim((string)$in['homeroom']) !== '') {
        $room = read_store('homerooms')[trim((string)$in['homeroom'])] ?? null;
        if ($room === null) respond(404, ['error' => 'No such homeroom.']);
        $targets = array_values(array_filter(
            $room['members'] ?? [],
            fn($e) => isset($users[$e])
        ));
        if (count($targets) === 0) respond(400, ['error' => 'That homeroom has nobody in it yet.']);
    } else {
        $email = strtolower(trim($in['email'] ?? ''));
        if (!isset($users[$email])) respond(404, ['error' => 'No such account.']);
        $targets = [$email];
    }

    $course = trim((string)($in['course'] ?? ''));
    $unit = trim((string)($in['unit'] ?? ''));
    if (catalog_course($course) === null) respond(400, ['error' => 'Unknown course.']);
    if ($unit !== '' && catalog_unit($course, $unit) === null) respond(400, ['error' => 'Unknown unit.']);

    $note = trim((string)($in['note'] ?? ''));
    if (mb_strlen($note) > NOTE_MAX) respond(400, ['error' => 'Keep the note under ' . NOTE_MAX . ' characters.']);

    $due = '';
    if ($deadlines) {
        $due = trim((string)($in['due'] ?? ''));
        if ($due !== '') {
            if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $due, $m) || !checkdate((int)$m[2], (int)$m[3], (int)$m[1])) {
                respond(400, ['error' => 'That due date does not look right.']);
            }
            if ($due < gmdate('Y-m-d')) respond(400, ['error' => 'That date is already behind us.']);
        }
    }

    $made = 0;
    foreach ($targets as $email) {
        // Don't stack the same unit on the same person twice while it's open.
        foreach (($all[$email] ?? []) as $a) {
            if (($a['course'] ?? '') === $course && ($a['unit'] ?? '') === $unit && empty($a['done'])) {
                continue 2;
            }
        }
        $id = bin2hex(random_bytes(8));
        $all[$email][$id] = [
            'course' => $course,
            'unit' => $unit,
            'note' => $note,
            'due' => $due,
            'by' => $auth['email'],
            'created' => gmdate('c'),
            'done' => false,
            'doneAt' => '',
        ];
        $made++;
    }
    write_store('assignments', $all);
    $what = $unit === '' ? ($titles[$course] ?? $course) : (catalog_unit($course, $unit)['title'] ?? $unit);
    audit_log($auth, 'assign', $what, count($targets) === 1 ? $targets[0] : count($targets) . ' students');
    respond(200, ['ok' => true, 'assigned' => $made, 'skipped' => count($targets) - $made]);
}

// The rest act on one existing assignment.
$email = strtolower(trim($in['email'] ?? '')) ?: $auth['email'];
$id = (string)($in['id'] ?? '');
if (!isset($all[$email][$id])) respond(404, ['error' => 'Assignment not found.']);
// A student may close their own; anything else is faculty.
if ($email !== $auth['email']) require_rank($auth, ROLE_RANK['educator']);

if ($action === 'done' || $action === 'reopen') {
    $done = $action === 'done';
    $all[$email][$id]['done'] = $done;
    $all[$email][$id]['doneAt'] = $done ? gmdate('c') : '';
    write_store('assignments', $all);
    respond(200, ['ok' => true]);
}

if ($action === 'delete') {
    require_rank($auth, ROLE_RANK['educator']);
    unset($all[$email][$id]);
    if (empty($all[$email])) unset($all[$email]);
    write_store('assignments', $all);
    audit_log($auth, 'assign.withdraw', $id, $email);
    respond(200, ['ok' => true]);
}

respond(400, ['error' => 'Unknown action.']);
