<?php
// Challenges: a time-boxed push, measured from what the student already does.
//
// The honest-measurement problem. Unit completions carry no timestamp, so
// "six units in five days" cannot be answered by counting completions inside
// a window. What it can be answered by is a baseline: the moment somebody
// joins, the school writes down where they stood, and progress is the
// distance travelled since. That is exactly how the weekly Honor Roll already
// works (`week.baseXp` in progress.php), and it needs no timestamps at all.
//
// Nothing here grants XP. XP lives in the progress blob the browser owns and
// overwrites wholesale on every sync, so a server-side grant would vanish at
// the next save. Finishing is recorded here instead, and shows up as a credit
// and as an event in the Quad feed.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

const NAME_MAX = 70;
const BLURB_MAX = 240;

// What a challenge can ask for. `absolute` metrics are a level to reach
// rather than a distance to travel: a streak of seven is seven, whether you
// arrived with three or with none.
function metrics(): array {
    return [
        'units' => ['name' => 'Units finished', 'unit' => 'units', 'absolute' => false],
        'xp' => ['name' => 'XP earned', 'unit' => 'XP', 'absolute' => false],
        'posts' => ['name' => 'Posts in the Quad', 'unit' => 'posts', 'absolute' => false],
        'finals' => ['name' => 'Finals passed', 'unit' => 'finals', 'absolute' => false],
        'streak' => ['name' => 'Day streak reached', 'unit' => 'days', 'absolute' => true],
    ];
}

// Where somebody stands right now on one metric.
function metric_value(string $email, string $metric, array $quad, array $finals): int {
    $state = state_of($email);
    switch ($metric) {
        case 'units':
            $n = 0;
            foreach (($state['done'] ?? []) as $list) $n += count($list);
            return $n;
        case 'xp':
            return (int)($state['xp'] ?? 0);
        case 'streak':
            return (int)($state['streak']['count'] ?? 0);
        case 'posts':
            $n = 0;
            foreach ($quad as $p) if (($p['email'] ?? '') === $email) $n++;
            return $n;
        case 'finals':
            $n = 0;
            foreach (($finals[$email] ?? []) as $rec) if (!empty($rec['passed'])) $n++;
            return $n;
    }
    return 0;
}

function is_open(array $c): bool {
    $now = gmdate('c');
    $starts = $c['startsAt'] ?? '';
    $ends = $c['endsAt'] ?? '';
    if ($starts !== '' && $now < $starts) return false;
    if ($ends !== '' && $now > $ends) return false;
    return true;
}

$auth = require_auth();
$isFaculty = auth_rank($auth) >= ROLE_RANK['educator'];
$me = $auth['email'];
$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    $all = read_store('challenges');
    $quad = read_store('quad');
    $finals = read_store('finals');
    $users = read_users();
    $metrics = metrics();
    $changed = false;
    $rows = [];

    foreach ($all as $id => $c) {
        $metric = $c['metric'] ?? 'units';
        $spec = $metrics[$metric] ?? $metrics['units'];
        $target = max(1, (int)($c['target'] ?? 1));
        $joined = $c['joined'] ?? [];

        $mine = $joined[$me] ?? null;
        $you = null;
        if ($mine !== null) {
            $now = metric_value($me, $metric, $quad, $finals);
            $base = empty($spec['absolute']) ? (int)($mine['base'] ?? 0) : 0;
            $done = max(0, $now - $base);
            // Finishing is written down once, with the date, so the feed can
            // say when it happened.
            if (!($mine['done'] ?? false) && $done >= $target && is_open($c)) {
                $all[$id]['joined'][$me]['done'] = true;
                $all[$id]['joined'][$me]['doneAt'] = gmdate('c');
                $mine['done'] = true;
                $changed = true;
                // Nobody watches a progress bar to the end. Tell them.
                notify(
                    $me,
                    'challenge',
                    'You finished ' . ($c['name'] ?? 'a challenge') . '. That is ' . $target . ' ' . $spec['unit'] . ' since you joined.',
                    '/learn/challenges/'
                );
            }
            $you = [
                'joined' => true,
                'done' => (bool)($mine['done'] ?? false),
                'doneAt' => $mine['doneAt'] ?? '',
                'progress' => min($done, $target),
            ];
        }

        // Who has finished, for the wall of names.
        $finishers = [];
        foreach ($joined as $email => $j) {
            if (!empty($j['done'])) $finishers[] = name_of($users, (string)$email);
        }

        $rows[] = [
            'id' => $id,
            'name' => $c['name'] ?? '',
            'blurb' => $c['blurb'] ?? '',
            'metric' => $metric,
            'metricName' => $spec['name'],
            'unit' => $spec['unit'],
            'absolute' => !empty($spec['absolute']),
            'target' => $target,
            'startsAt' => $c['startsAt'] ?? '',
            'endsAt' => $c['endsAt'] ?? '',
            'open' => is_open($c),
            'members' => count($joined),
            'finished' => count($finishers),
            'finishers' => array_slice($finishers, 0, 12),
            'you' => $you,
        ];
    }

    if ($changed) write_store('challenges', $all);

    usort($rows, function ($a, $b) {
        if ($a['open'] !== $b['open']) return $a['open'] ? -1 : 1;
        return strcmp((string)$a['endsAt'], (string)$b['endsAt']);
    });

    respond(200, ['ok' => true, 'challenges' => $rows, 'metrics' => $metrics, 'faculty' => $isFaculty]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
$action = (string)($in['action'] ?? '');
$all = read_store('challenges');

if ($action === 'join' || $action === 'leave') {
    $id = (string)($in['id'] ?? '');
    if (!isset($all[$id])) respond(404, ['error' => 'No such challenge.']);
    if ($action === 'join' && !is_open($all[$id])) respond(400, ['error' => 'That one is closed.']);
    if ($action === 'leave') {
        unset($all[$id]['joined'][$me]);
    } else {
        $metric = $all[$id]['metric'] ?? 'units';
        $spec = metrics()[$metric] ?? [];
        // The baseline is the whole trick: where you stood when you said yes.
        $all[$id]['joined'][$me] = [
            'at' => gmdate('c'),
            'base' => empty($spec['absolute'])
                ? metric_value($me, $metric, read_store('quad'), read_store('finals'))
                : 0,
            'done' => false,
        ];
    }
    write_store('challenges', $all);
    respond(200, ['ok' => true, 'joined' => $action === 'join']);
}

// Everything below is faculty work.
require_rank($auth, ROLE_RANK['educator']);

if ($action === 'create') {
    $name = trim((string)($in['name'] ?? ''));
    $blurb = trim((string)($in['blurb'] ?? ''));
    $metric = (string)($in['metric'] ?? 'units');
    $target = (int)($in['target'] ?? 0);
    $starts = trim((string)($in['startsAt'] ?? ''));
    $ends = trim((string)($in['endsAt'] ?? ''));

    if ($name === '' || mb_strlen($name) > NAME_MAX) respond(400, ['error' => 'Give it a name, under ' . NAME_MAX . ' characters.']);
    if (mb_strlen($blurb) > BLURB_MAX) respond(400, ['error' => 'Keep the blurb under ' . BLURB_MAX . ' characters.']);
    if (!isset(metrics()[$metric])) respond(400, ['error' => 'Unknown metric.']);
    if ($target < 1) respond(400, ['error' => 'The target has to be at least 1.']);
    if ($ends !== '' && $starts !== '' && $ends < $starts) respond(400, ['error' => 'It cannot end before it starts.']);

    $id = bin2hex(random_bytes(8));
    $all[$id] = [
        'name' => $name,
        'blurb' => $blurb,
        'metric' => $metric,
        'target' => $target,
        'startsAt' => $starts,
        'endsAt' => $ends,
        'created' => gmdate('c'),
        'createdBy' => $me,
        'joined' => [],
    ];
    write_store('challenges', $all);
    audit_log($auth, 'challenge.create', $name);
    respond(200, ['ok' => true, 'id' => $id]);
}

if ($action === 'delete') {
    $id = (string)($in['id'] ?? '');
    if (!isset($all[$id])) respond(404, ['error' => 'No such challenge.']);
    audit_log($auth, 'challenge.delete', (string)($all[$id]['name'] ?? ''));
    unset($all[$id]);
    write_store('challenges', $all);
    respond(200, ['ok' => true]);
}

respond(400, ['error' => 'Unknown action.']);
