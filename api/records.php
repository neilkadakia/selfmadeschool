<?php
// The Records Office: what the school can actually prove about itself.
//
// Every number here is computed from stored data. Nothing is sampled,
// smoothed, projected, or made up. Where the data cannot answer a
// question, this file returns nothing rather than a plausible shape:
// unit completions carry no timestamp in the synced state, so there is
// no completions-over-time chart, and there should not be one.
//
// What the record does support:
//   pulse       headline counts, all live
//   signups     accounts created per week, from the users store
//   active      students active per day for 30 days, from activity logs
//   funnel      per course, how many finished each unit: where they stop
//   finals      attempts, pass rate and average, from the Registrar
//   hard        the questions the class keeps missing, from the make-up pile
//   fieldwork   which units get filed on, and which get ignored
//   levels      how the class is spread across the ladder
//
//   ?csv=students|funnel|fieldwork   the same, as a spreadsheet

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

// Educators get the teaching numbers: the funnel, the questions the class
// keeps missing, how the finals went. Those are lesson-planning tools, not
// business metrics, and locking a teacher out of them would be daft.
// Signups are the school's own business, so they need an administrator.
$auth = require_auth();
require_rank($auth, ROLE_RANK['educator']);
$isAdmin = auth_rank($auth) >= ROLE_RANK['admin'];
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') respond(405, ['error' => 'GET only.']);

$users = read_users();
$titles = course_titles();

// Read every student once. The school is small; this is one pass, not a
// query per number below.
$students = [];
foreach ($users as $email => $u) {
    if (role_rank($u['role'] ?? 'student') >= ROLE_RANK['educator']) continue;
    $saved = progress_of($email);
    $state = $saved['state'] ?? [];
    $students[$email] = [
        'user' => $u,
        'state' => is_array($state) ? $state : [],
        'updatedAt' => $saved['updatedAt'] ?? '',
    ];
}

// ---------- CSV exports ----------

if (isset($_GET['csv'])) {
    $report = (string)$_GET['csv'];
    $rows = [];

    if ($report === 'students') {
        $rows[] = ['Name', 'Email', 'Role', 'Homeroom', 'Plan', 'Joined', 'Last Active',
                   'Units', 'XP', 'Streak', 'Badges', 'Finals Passed', 'Field Work Filed'];
        $homerooms = read_store('homerooms');
        foreach ($students as $email => $s) {
            $doneTotal = 0;
            foreach (($s['state']['done'] ?? []) as $list) $doneTotal += is_array($list) ? count($list) : 0;
            $finals = 0;
            foreach (($s['state']['finals'] ?? []) as $f) if (!empty($f['passed'])) $finals++;
            $roomId = $s['user']['homeroom'] ?? '';
            $rows[] = [
                name_of($users, $email), $email, $s['user']['role'] ?? 'student',
                $homerooms[$roomId]['name'] ?? '', $s['user']['plan'] ?? '',
                substr((string)($s['user']['created'] ?? ''), 0, 10),
                substr($s['updatedAt'], 0, 10),
                $doneTotal, (int)($s['state']['xp'] ?? 0),
                (int)($s['state']['streak']['count'] ?? 0),
                count($s['state']['badges'] ?? []), $finals,
                count($s['state']['fieldwork'] ?? []),
            ];
        }
    } elseif ($report === 'funnel') {
        $rows[] = ['Course', 'Unit', 'Number', 'Taught', 'Completed By', 'Of Students', 'Percent'];
        $total = count($students);
        foreach (catalog()['courses'] as $c) {
            foreach ($c['units'] as $u) {
                $n = 0;
                foreach ($students as $s) {
                    $done = $s['state']['done'][$c['slug']] ?? [];
                    if (is_array($done) && in_array($u['slug'], $done, true)) $n++;
                }
                $rows[] = [
                    $c['title'], $u['title'], $u['number'],
                    empty($u['taught']) ? 'no' : 'yes',
                    $n, $total, $total > 0 ? round($n / $total * 100) : 0,
                ];
            }
        }
    } elseif ($report === 'fieldwork') {
        $rows[] = ['Student', 'Email', 'Course', 'Unit', 'Filed', 'What They Wrote', 'Answered By', 'Answered'];
        $replies = read_store('fieldwork');
        foreach ($students as $email => $s) {
            foreach (($s['state']['fieldwork'] ?? []) as $key => $rec) {
                if (!is_array($rec)) continue;
                [$cs, $us] = array_pad(explode('/', (string)$key, 2), 2, '');
                $r = $replies[$email][$key] ?? null;
                $rows[] = [
                    name_of($users, $email), $email,
                    $titles[$cs] ?? $cs,
                    catalog_unit($cs, $us)['title'] ?? $us,
                    (string)($rec['date'] ?? ''), (string)($rec['note'] ?? ''),
                    $r === null ? '' : name_of($users, (string)($r['by'] ?? '')),
                    $r === null ? '' : substr((string)($r['at'] ?? ''), 0, 10),
                ];
            }
        }
    } else {
        respond(404, ['error' => 'Unknown report.']);
    }

    audit_log($auth, 'records.export', $report);
    $esc = fn($v) => '"' . str_replace('"', '""', (string)$v) . '"';
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="self-made-school-' . $report . '-' . gmdate('Y-m-d') . '.csv"');
    // A leading BOM so Excel opens accented names correctly.
    echo "\xEF\xBB\xBF";
    foreach ($rows as $r) echo implode(',', array_map($esc, $r)) . "\r\n";
    exit;
}

// ---------- pulse ----------

$now = time();
$activeWeek = 0;
$active30 = 0;
$unitsDone = 0;
$finalsPassed = 0;
$fieldworkFiled = 0;
$streakSum = 0;
$streakHeld = 0;

foreach ($students as $s) {
    $last = $s['updatedAt'];
    $since = $last === '' ? INF : ($now - (int)strtotime($last)) / 86400;
    if ($since <= 7) $activeWeek++;
    if ($since <= 30) $active30++;
    foreach (($s['state']['done'] ?? []) as $list) $unitsDone += is_array($list) ? count($list) : 0;
    foreach (($s['state']['finals'] ?? []) as $f) if (!empty($f['passed'])) $finalsPassed++;
    $fieldworkFiled += count($s['state']['fieldwork'] ?? []);
    $st = (int)($s['state']['streak']['count'] ?? 0);
    if ($st > 0) { $streakSum += $st; $streakHeld++; }
}

$totalStudents = count($students);
// How many students got past the first unit: the number that says whether
// the front door works.
$started = 0;
foreach ($students as $s) {
    foreach (($s['state']['done'] ?? []) as $list) {
        if (is_array($list) && count($list) > 0) { $started++; break; }
    }
}

// ---------- signups per week, 12 weeks ----------

$weeks = [];
for ($i = 11; $i >= 0; $i--) {
    $end = $now - $i * 7 * 86400;
    $start = $end - 7 * 86400;
    $weeks[] = ['label' => gmdate('n/j', $end), 'start' => $start, 'end' => $end, 'signups' => 0];
}
foreach ($students as $s) {
    $created = $s['user']['created'] ?? '';
    if ($created === '') continue;
    $t = (int)strtotime($created);
    foreach ($weeks as $i => $w) {
        if ($t >= $w['start'] && $t < $w['end']) { $weeks[$i]['signups']++; break; }
    }
}
$signups = array_map(fn($w) => ['label' => $w['label'], 'signups' => $w['signups']], $weeks);

// ---------- active students per day, 30 days ----------
//
// Every student keeps a rolling list of the days they showed up. Counting
// the days across the class gives a real attendance chart.

$byDay = [];
for ($i = 29; $i >= 0; $i--) $byDay[gmdate('Y-m-d', $now - $i * 86400)] = 0;
foreach ($students as $s) {
    foreach (($s['state']['activity'] ?? []) as $day) {
        if (isset($byDay[$day])) $byDay[$day]++;
    }
}
$active = [];
foreach ($byDay as $day => $n) $active[] = ['day' => $day, 'students' => $n];

// ---------- the funnel: where they stop ----------

$funnel = [];
foreach (catalog()['courses'] as $c) {
    $units = [];
    foreach ($c['units'] as $u) {
        $n = 0;
        $filed = 0;
        foreach ($students as $email => $s) {
            $done = $s['state']['done'][$c['slug']] ?? [];
            if (is_array($done) && in_array($u['slug'], $done, true)) $n++;
            if (isset($s['state']['fieldwork'][$c['slug'] . '/' . $u['slug']])) $filed++;
        }
        $units[] = [
            'slug' => $u['slug'],
            'title' => $u['title'],
            'number' => $u['number'],
            'taught' => !empty($u['taught']),
            'done' => $n,
            'filed' => $filed,
            'pct' => $totalStudents > 0 ? (int)round($n / $totalStudents * 100) : 0,
        ];
    }
    $funnel[] = [
        'slug' => $c['slug'],
        'title' => $c['title'],
        'tone' => $c['tone'] ?? 'acc',
        'units' => $units,
    ];
}

// ---------- finals, from the Registrar ----------

$finalsStore = read_store('finals');
$finals = [];
foreach (catalog()['courses'] as $c) {
    $attempts = 0; $sitters = 0; $passes = 0; $scoreSum = 0; $scored = 0;
    foreach ($finalsStore as $email => $byCourse) {
        if (!isset($students[$email])) continue;
        $r = $byCourse[$c['slug']] ?? null;
        if ($r === null) continue;
        $sitters++;
        $attempts += (int)($r['attempts'] ?? 0);
        if (!empty($r['passed'])) $passes++;
        if (isset($r['score'], $r['total']) && (int)$r['total'] > 0) {
            $scoreSum += (int)$r['score'];
            $scored++;
        }
    }
    $finals[] = [
        'slug' => $c['slug'],
        'title' => $c['title'],
        'sitters' => $sitters,
        'attempts' => $attempts,
        'passed' => $passes,
        'passRate' => $sitters > 0 ? (int)round($passes / $sitters * 100) : null,
        'avgScore' => $scored > 0 ? round($scoreSum / $scored, 1) : null,
    ];
}

// ---------- the questions the class keeps missing ----------
//
// Every miss lands in that student's make-up pile and stays until they get
// it right twice running. Counting across the class shows which questions
// are genuinely hard, and which ones are just badly written.

$hard = [];
foreach ($students as $s) {
    foreach (($s['state']['mastery'] ?? []) as $key => $entry) {
        if (!is_array($entry)) continue;
        $miss = (int)($entry['miss'] ?? 0);
        if ($miss < 1) continue;
        if (!isset($hard[$key])) $hard[$key] = ['students' => 0, 'misses' => 0, 'stuck' => 0];
        $hard[$key]['students']++;
        $hard[$key]['misses'] += $miss;
        // Still in the pile: missed it and hasn't earned it back yet.
        if ((int)($entry['streak'] ?? 0) < 2) $hard[$key]['stuck']++;
    }
}
$hardRows = [];
foreach ($hard as $key => $h) {
    $hash = strrpos($key, '#');
    if ($hash === false) continue;
    $path = substr($key, 0, $hash);
    $index = (int)substr($key, $hash + 1);
    $slash = strpos($path, '/');
    if ($slash === false) continue;
    $courseSlug = substr($path, 0, $slash);
    $unitSlug = substr($path, $slash + 1);
    $unit = catalog_unit($courseSlug, $unitSlug);
    if ($unit === null) continue;   // question retired in a rewrite
    $asks = $unit['asks'] ?? [];
    $hardRows[] = [
        'key' => $key,
        'course' => $courseSlug,
        'courseTitle' => $titles[$courseSlug] ?? $courseSlug,
        'unit' => $unitSlug,
        'unitTitle' => $unit['title'] ?? $unitSlug,
        'number' => $index + 1,
        'ask' => $asks[$index] ?? '',
        'students' => $h['students'],
        'misses' => $h['misses'],
        'stuck' => $h['stuck'],
    ];
}
usort($hardRows, fn($a, $b) => $b['students'] <=> $a['students'] ?: $b['misses'] <=> $a['misses']);

// ---------- the ladder ----------

const LADDER = [
    [0, 'Freshman'], [300, 'Sophomore'], [700, 'Junior'],
    [1200, 'Senior'], [2000, 'Valedictorian'], [3000, 'Self Made'],
];
$levels = [];
foreach (LADDER as [$at, $name]) $levels[$name] = ['name' => $name, 'at' => $at, 'students' => 0];
foreach ($students as $s) {
    $xp = (int)($s['state']['xp'] ?? 0);
    $name = LADDER[0][1];
    foreach (LADDER as [$at, $n]) if ($xp >= $at) $name = $n;
    $levels[$name]['students']++;
}

respond(200, [
    'ok' => true,
    'pulse' => [
        'students' => $totalStudents,
        'started' => $started,
        'activeWeek' => $activeWeek,
        'active30' => $active30,
        'unitsDone' => $unitsDone,
        'finalsPassed' => $finalsPassed,
        'fieldworkFiled' => $fieldworkFiled,
        'avgStreak' => $streakHeld > 0 ? round($streakSum / $streakHeld, 1) : 0,
        'onStreak' => $streakHeld,
    ],
    // Who is signing up is the school's business, not a teaching number.
    'signups' => $isAdmin ? $signups : null,
    'active' => $active,
    'funnel' => $funnel,
    'finals' => $finals,
    'hard' => array_slice($hardRows, 0, 20),
    'levels' => array_values($levels),
]);
