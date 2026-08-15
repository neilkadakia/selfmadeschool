<?php
// Per-user LMS progress: one JSON blob per account.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

$auth = require_auth();
$store = 'progress_' . sha1($auth['email']);
$method = $_SERVER['REQUEST_METHOD'] ?? '';

// ISO year-week, e.g. 2026-W33. The weekly race resets Monday 00:00 UTC.
function week_key(): string {
    return gmdate('o-\WW');
}

if ($method === 'GET' && isset($_GET['leaderboard'])) {
    // Honor Roll, any signed-in student: names and numbers only, no emails.
    // Two races: all-time XP, and XP earned since Monday (fresh start weekly
    // so early joiners don't own the board forever).
    $users = read_store('users');
    $wk = week_key();
    $rows = [];
    foreach ($users as $email => $u) {
        $saved = read_store('progress_' . sha1($email));
        $state = $saved['state'] ?? [];
        $doneTotal = 0;
        foreach (($state['done'] ?? []) as $list) $doneTotal += count($list);
        $xp = (int)($state['xp'] ?? 0);
        $week = $saved['week'] ?? null;
        $weekXp = ($week !== null && ($week['key'] ?? '') === $wk)
            ? max(0, $xp - (int)($week['baseXp'] ?? 0))
            : 0;
        $rows[] = [
            'email' => $email,
            'name' => ($u['name'] ?? '') !== '' ? $u['name'] : 'Student',
            'xp' => $xp,
            'weekXp' => $weekXp,
            'streak' => (int)($state['streak']['count'] ?? 0),
            'units' => $doneTotal,
        ];
    }
    $boardOf = function (array $rows, string $field) use ($auth): array {
        usort($rows, fn($a, $b) => $b[$field] <=> $a[$field]);
        $you = null;
        $board = [];
        foreach ($rows as $i => $r) {
            $isYou = $r['email'] === $auth['email'];
            if ($isYou) $you = ['rank' => $i + 1, 'xp' => $r[$field]];
            if ($i < 10) {
                $board[] = [
                    'rank' => $i + 1,
                    'you' => $isYou,
                    'name' => $r['name'],
                    'xp' => $r[$field],
                    'streak' => $r['streak'],
                    'units' => $r['units'],
                ];
            }
        }
        return ['board' => $board, 'you' => $you];
    };
    $all = $boardOf($rows, 'xp');
    $week = $boardOf($rows, 'weekXp');
    respond(200, [
        'ok' => true,
        'board' => $all['board'],
        'you' => $all['you'],
        'weekBoard' => $week['board'],
        'weekYou' => $week['you'],
        'classSize' => count($rows),
    ]);
}

if ($method === 'GET' && isset($_GET['all'])) {
    // Class overview, faculty (educator and up): one row per student.
    require_rank($auth, ROLE_RANK['educator']);
    $users = read_users();
    $rows = [];
    foreach ($users as $email => $u) {
        $saved = read_store('progress_' . sha1($email));
        $state = $saved['state'] ?? [];
        $doneTotal = 0;
        foreach (($state['done'] ?? []) as $list) $doneTotal += count($list);
        $finalsPassed = 0;
        foreach (($state['finals'] ?? []) as $f) {
            if (!empty($f['passed'])) $finalsPassed++;
        }
        $rows[] = [
            'email' => $email,
            'name' => $u['name'] ?? '',
            'role' => $u['role'] ?? 'student',
            'units' => $doneTotal,
            'xp' => (int)($state['xp'] ?? 0),
            'streak' => (int)($state['streak']['count'] ?? 0),
            'badges' => count($state['badges'] ?? []),
            'finals' => $finalsPassed,
            'lastActive' => $saved['updatedAt'] ?? '',
            // Per-course done lists so the gradebook can draw the unit matrix.
            'done' => (object)($state['done'] ?? []),
        ];
    }
    usort($rows, fn($a, $b) => $b['xp'] <=> $a['xp']);
    respond(200, ['ok' => true, 'students' => $rows]);
}

if ($method === 'GET') {
    $saved = read_store($store);
    respond(200, [
        'ok' => true,
        'state' => $saved['state'] ?? null,
        'updatedAt' => $saved['updatedAt'] ?? null,
    ]);
}

if ($method === 'PUT' || $method === 'POST') {
    $in = body_json();
    $state = $in['state'] ?? null;
    if (!is_array($state)) respond(400, ['error' => 'state object required.']);
    if (strlen(json_encode($state)) > 256 * 1024) respond(413, ['error' => 'state too large.']);
    // Weekly race baseline: on the first sync of a new ISO week, the previous
    // stored XP becomes the week's floor, so XP earned today still counts
    // even when it arrives in the same sync that rolls the week over.
    $saved = read_store($store);
    $wk = week_key();
    $week = $saved['week'] ?? null;
    if ($week === null || ($week['key'] ?? '') !== $wk) {
        $week = ['key' => $wk, 'baseXp' => (int)($saved['state']['xp'] ?? 0)];
    }
    write_store($store, ['state' => $state, 'week' => $week, 'updatedAt' => gmdate('c')]);
    respond(200, ['ok' => true, 'updatedAt' => gmdate('c')]);
}

respond(405, ['error' => 'GET or PUT only.']);
