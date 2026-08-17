<?php
// The Faculty Lounge, read side. Three views behind one auth check:
//
//   ?view=desk               the Front Desk: what needs a teacher today
//   ?view=roster             the Gradebook: one row per student
//   ?view=student&email=...  the Student File: everything about one person
//
// Faculty writes live in their own files (fieldwork.php, notes.php,
// assign.php, homeroom.php) so a student's next progress sync can never
// overwrite something a teacher wrote.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

$auth = require_auth();
require_rank($auth, ROLE_RANK['educator']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') respond(405, ['error' => 'GET only.']);

const QUIET_DAYS = 7;      // no activity this long and the desk says so
const DESK_LIMIT = 12;     // how many of each kind the Front Desk shows

$users = read_users();
$view = $_GET['view'] ?? 'desk';

// ---------- shared reads ----------

function days_since(string $iso): float {
    if ($iso === '') return INF;
    $t = strtotime($iso);
    return $t === false ? INF : (time() - $t) / 86400;
}

// One student's headline numbers, computed from their synced state.
function student_row(string $email, array $user): array {
    $saved = progress_of($email);
    $state = $saved['state'] ?? [];
    if (!is_array($state)) $state = [];

    $done = $state['done'] ?? [];
    $doneTotal = 0;
    foreach ($done as $list) $doneTotal += is_array($list) ? count($list) : 0;

    $finalsPassed = 0;
    foreach (($state['finals'] ?? []) as $f) {
        if (!empty($f['passed'])) $finalsPassed++;
    }

    return [
        'email' => $email,
        'name' => $user['name'] ?? '',
        'role' => $user['role'] ?? 'student',
        'homeroom' => $user['homeroom'] ?? '',
        'plan' => $user['plan'] ?? '',
        'units' => $doneTotal,
        'xp' => (int)($state['xp'] ?? 0),
        'streak' => (int)($state['streak']['count'] ?? 0),
        'badges' => count($state['badges'] ?? []),
        'finals' => $finalsPassed,
        'fieldwork' => count($state['fieldwork'] ?? []),
        'lastActive' => $saved['updatedAt'] ?? '',
        'joined' => $user['created'] ?? '',
        'done' => (object)$done,
        'nudges' => empty($user['nudgesOff']),
    ];
}

// ---------- the Front Desk ----------

if ($view === 'desk') {
    $replies = read_store('fieldwork');
    $titles = course_titles();
    $today = gmdate('Y-m-d');
    $weekAgo = gmdate('c', time() - 7 * 86400);

    $pulse = [
        'students' => 0,
        'faculty' => 0,
        'activeWeek' => 0,
        'unitsDone' => 0,
        'finalsPassed' => 0,
        'quiet' => 0,
    ];
    $waiting = [];   // Field Work filed but not answered
    $quiet = [];     // started, then went silent
    $newest = [];    // joined recently, for a welcome

    foreach ($users as $email => $u) {
        $isStudent = role_rank($u['role'] ?? 'student') < ROLE_RANK['educator'];
        if ($isStudent) $pulse['students']++;
        else $pulse['faculty']++;

        $saved = progress_of($email);
        $state = $saved['state'] ?? [];
        if (!is_array($state)) $state = [];
        $last = $saved['updatedAt'] ?? '';
        $since = days_since($last);

        if ($since <= 7) $pulse['activeWeek']++;
        foreach (($state['done'] ?? []) as $list) $pulse['unitsDone'] += is_array($list) ? count($list) : 0;
        foreach (($state['finals'] ?? []) as $f) if (!empty($f['passed'])) $pulse['finalsPassed']++;

        if (!$isStudent) continue;

        // Field Work waiting on a reply, newest filings first.
        foreach (($state['fieldwork'] ?? []) as $key => $rec) {
            if (!is_array($rec)) continue;
            $note = trim((string)($rec['note'] ?? ''));
            if ($note === '') continue;              // nothing to read yet
            if (isset($replies[$email][$key])) continue;  // already answered
            [$courseSlug, $unitSlug] = array_pad(explode('/', (string)$key, 2), 2, '');
            $unit = catalog_unit($courseSlug, $unitSlug);
            $waiting[] = [
                'email' => $email,
                'name' => name_of($users, $email),
                'course' => $courseSlug,
                'courseTitle' => $titles[$courseSlug] ?? $courseSlug,
                'unit' => $unitSlug,
                'unitTitle' => $unit['title'] ?? $unitSlug,
                'note' => $note,
                'date' => (string)($rec['date'] ?? ''),
            ];
        }

        $started = 0;
        foreach (($state['done'] ?? []) as $list) $started += is_array($list) ? count($list) : 0;
        if ($started > 0 && $since >= QUIET_DAYS && $since !== INF) {
            $pulse['quiet']++;
            $quiet[] = [
                'email' => $email,
                'name' => name_of($users, $email),
                'days' => (int)floor($since),
                'units' => $started,
                'streak' => (int)($state['streak']['count'] ?? 0),
                'lastActive' => $last,
                'nudges' => empty($u['nudgesOff']),
            ];
        }

        $created = $u['created'] ?? '';
        if ($created !== '' && $created >= $weekAgo) {
            $newest[] = [
                'email' => $email,
                'name' => name_of($users, $email),
                'joined' => $created,
                'units' => $started,
            ];
        }
    }

    usort($waiting, fn($a, $b) => strcmp($b['date'], $a['date']));
    usort($quiet, fn($a, $b) => $b['days'] <=> $a['days']);
    usort($newest, fn($a, $b) => strcmp($b['joined'], $a['joined']));

    // Study Group posts nobody on staff has answered or endorsed yet.
    $discuss = read_store('discuss');
    $unanswered = [];
    $facultyEmails = [];
    foreach ($users as $e => $u) {
        if (role_rank($u['role'] ?? 'student') >= ROLE_RANK['educator']) $facultyEmails[$e] = true;
    }
    // A thread counts as answered once any member of staff has posted in it.
    $threadsWithStaff = [];
    foreach ($discuss as $p) {
        if (isset($facultyEmails[$p['email'] ?? ''])) {
            $threadsWithStaff[($p['course'] ?? '') . '/' . ($p['unit'] ?? '')] = true;
        }
    }
    foreach ($discuss as $id => $p) {
        if (isset($facultyEmails[$p['email'] ?? ''])) continue;
        if (!empty($p['endorsed'])) continue;
        $thread = ($p['course'] ?? '') . '/' . ($p['unit'] ?? '');
        if (isset($threadsWithStaff[$thread])) continue;
        $unit = catalog_unit((string)($p['course'] ?? ''), (string)($p['unit'] ?? ''));
        $unanswered[] = [
            'id' => $id,
            'email' => $p['email'] ?? '',
            'name' => $p['name'] ?? 'Student',
            'text' => $p['text'] ?? '',
            'created' => $p['created'] ?? '',
            'ups' => count($p['up'] ?? []),
            'course' => $p['course'] ?? '',
            'courseTitle' => $titles[$p['course'] ?? ''] ?? '',
            'unit' => $p['unit'] ?? '',
            'unitTitle' => $unit['title'] ?? ($p['unit'] ?? ''),
        ];
    }
    usort($unanswered, fn($a, $b) => strcmp($b['created'], $a['created']));

    // Office Hours still ahead, soonest first.
    $sessions = read_store('sessions');
    $upcoming = [];
    foreach ($sessions as $id => $s) {
        if (($s['startsAt'] ?? '') < gmdate('c')) continue;
        $upcoming[] = [
            'id' => $id,
            'title' => $s['title'] ?? '',
            'startsAt' => $s['startsAt'] ?? '',
            'capacity' => (int)($s['capacity'] ?? 0),
            'seats' => count($s['rsvps'] ?? []),
            'waiting' => count($s['waitlist'] ?? []),
        ];
    }
    usort($upcoming, fn($a, $b) => strcmp($a['startsAt'], $b['startsAt']));

    respond(200, [
        'ok' => true,
        'pulse' => $pulse,
        'fieldwork' => array_slice($waiting, 0, DESK_LIMIT),
        'fieldworkTotal' => count($waiting),
        'questions' => array_slice($unanswered, 0, DESK_LIMIT),
        'questionsTotal' => count($unanswered),
        'quiet' => array_slice($quiet, 0, DESK_LIMIT),
        'newest' => array_slice($newest, 0, DESK_LIMIT),
        'sessions' => array_slice($upcoming, 0, 4),
        'today' => $today,
    ]);
}

// ---------- the Gradebook roster ----------

if ($view === 'roster') {
    $rows = [];
    foreach ($users as $email => $u) $rows[] = student_row($email, $u);
    usort($rows, fn($a, $b) => $b['xp'] <=> $a['xp']);

    // The catalog travels with the roster so the unit matrix can be drawn
    // without the client guessing which units are actually taught.
    $courses = [];
    foreach (catalog()['courses'] as $c) {
        $courses[] = [
            'slug' => $c['slug'],
            'title' => $c['title'],
            'tone' => $c['tone'] ?? 'acc',
            'units' => array_map(
                fn($u) => ['slug' => $u['slug'], 'title' => $u['title'], 'taught' => !empty($u['taught'])],
                $c['units'] ?? []
            ),
        ];
    }

    $homerooms = read_store('homerooms');
    $list = [];
    foreach ($homerooms as $id => $h) {
        $list[] = ['id' => $id, 'name' => $h['name'] ?? '', 'color' => $h['color'] ?? 'acc'];
    }

    respond(200, [
        'ok' => true,
        'students' => $rows,
        'courses' => $courses,
        'homerooms' => $list,
        'settings' => read_settings()['features'],
    ]);
}

// ---------- the Student File ----------

if ($view === 'student') {
    $email = strtolower(trim($_GET['email'] ?? ''));
    $u = $users[$email] ?? null;
    if ($u === null) respond(404, ['error' => 'No such account.']);

    $saved = progress_of($email);
    $state = $saved['state'] ?? [];
    if (!is_array($state)) $state = [];
    $titles = course_titles();
    $replies = read_store('fieldwork');

    // Course by course: how far, and how the final went.
    $courses = [];
    foreach (catalog()['courses'] as $c) {
        $slug = $c['slug'];
        $taught = taught_units($slug);
        $done = $state['done'][$slug] ?? [];
        $done = is_array($done) ? $done : [];
        $doneTaught = array_values(array_intersect($done, $taught));
        $final = $state['finals'][$slug] ?? null;
        $courses[] = [
            'slug' => $slug,
            'title' => $c['title'],
            'tone' => $c['tone'] ?? 'acc',
            'done' => count($doneTaught),
            'total' => count($taught),
            'pct' => count($taught) > 0 ? (int)round(count($doneTaught) / count($taught) * 100) : 0,
            'final' => $final === null ? null : [
                'score' => (int)($final['score'] ?? 0),
                'total' => (int)($final['total'] ?? 0),
                'passed' => !empty($final['passed']),
                'date' => $final['date'] ?? '',
            ],
            'units' => array_map(fn($un) => [
                'slug' => $un['slug'],
                'title' => $un['title'],
                'taught' => !empty($un['taught']),
                'done' => in_array($un['slug'], $done, true),
                'quizBest' => (int)($state['quizBest'][$slug . '/' . $un['slug']] ?? 0),
                'questions' => (int)($un['questions'] ?? 0),
            ], $c['units'] ?? []),
        ];
    }

    // Field Work, newest first, each with the faculty reply if there is one.
    $filings = [];
    foreach (($state['fieldwork'] ?? []) as $key => $rec) {
        if (!is_array($rec)) continue;
        [$courseSlug, $unitSlug] = array_pad(explode('/', (string)$key, 2), 2, '');
        $unit = catalog_unit($courseSlug, $unitSlug);
        $reply = $replies[$email][$key] ?? null;
        $filings[] = [
            'key' => $key,
            'course' => $courseSlug,
            'courseTitle' => $titles[$courseSlug] ?? $courseSlug,
            'unit' => $unitSlug,
            'unitTitle' => $unit['title'] ?? $unitSlug,
            'action' => $unit['action'] ?? '',
            'note' => (string)($rec['note'] ?? ''),
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
    usort($filings, fn($a, $b) => strcmp($b['date'], $a['date']));

    // What they've said in the Study Group.
    $posts = [];
    foreach (read_store('discuss') as $id => $p) {
        if (($p['email'] ?? '') !== $email) continue;
        $unit = catalog_unit((string)($p['course'] ?? ''), (string)($p['unit'] ?? ''));
        $posts[] = [
            'id' => $id,
            'text' => $p['text'] ?? '',
            'created' => $p['created'] ?? '',
            'ups' => count($p['up'] ?? []),
            'endorsed' => !empty($p['endorsed']),
            'course' => $p['course'] ?? '',
            'unit' => $p['unit'] ?? '',
            'unitTitle' => $unit['title'] ?? ($p['unit'] ?? ''),
        ];
    }
    usort($posts, fn($a, $b) => strcmp($b['created'], $a['created']));

    // Private faculty notes.
    $notes = [];
    foreach ((read_store('learner_notes')[$email] ?? []) as $id => $n) {
        $notes[] = [
            'id' => $id,
            'text' => $n['text'] ?? '',
            'by' => $n['by'] ?? '',
            'byName' => name_of($users, (string)($n['by'] ?? '')),
            'at' => $n['at'] ?? '',
            'mine' => ($n['by'] ?? '') === $auth['email'],
        ];
    }
    usort($notes, fn($a, $b) => strcmp($b['at'], $a['at']));

    // Open assignments.
    $assignments = [];
    foreach ((read_store('assignments')[$email] ?? []) as $id => $a) {
        $unit = $a['unit'] === '' ? null : catalog_unit((string)$a['course'], (string)$a['unit']);
        $assignments[] = [
            'id' => $id,
            'course' => $a['course'] ?? '',
            'courseTitle' => $titles[$a['course'] ?? ''] ?? '',
            'unit' => $a['unit'] ?? '',
            'unitTitle' => $unit['title'] ?? '',
            'note' => $a['note'] ?? '',
            'due' => $a['due'] ?? '',
            'by' => $a['by'] ?? '',
            'byName' => name_of($users, (string)($a['by'] ?? '')),
            'created' => $a['created'] ?? '',
            'done' => !empty($a['done']),
        ];
    }
    usort($assignments, fn($a, $b) => strcmp($b['created'], $a['created']));

    // Which nudges the school has already sent, so faculty don't pile on.
    $sent = read_store('nudges')[$email] ?? [];

    respond(200, [
        'ok' => true,
        'student' => array_merge(public_user($email, $u), [
            'joined' => $u['created'] ?? '',
            'lastActive' => $saved['updatedAt'] ?? '',
        ]),
        'stats' => [
            'xp' => (int)($state['xp'] ?? 0),
            'credits' => (int)($state['credits'] ?? 0),
            'streak' => (int)($state['streak']['count'] ?? 0),
            'badges' => $state['badges'] ?? [],
            'activity' => $state['activity'] ?? [],
        ],
        'courses' => $courses,
        'fieldwork' => $filings,
        'posts' => $posts,
        'notes' => $notes,
        'assignments' => $assignments,
        'nudges' => $sent,
        'access' => access_map($email, $u),
    ]);
}

respond(400, ['error' => 'Unknown view.']);
