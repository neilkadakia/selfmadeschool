<?php
// Per-user LMS progress: one JSON blob per account.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

$auth = require_auth();
$store = 'progress_' . sha1($auth['email']);
$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET' && isset($_GET['leaderboard'])) {
    // Honor Roll — any signed-in student: names and numbers only, no emails.
    $users = read_store('users');
    $rows = [];
    foreach ($users as $email => $u) {
        $saved = read_store('progress_' . sha1($email));
        $state = $saved['state'] ?? [];
        $doneTotal = 0;
        foreach (($state['done'] ?? []) as $list) $doneTotal += count($list);
        $rows[] = [
            'email' => $email,
            'name' => ($u['name'] ?? '') !== '' ? $u['name'] : 'Student',
            'xp' => (int)($state['xp'] ?? 0),
            'streak' => (int)($state['streak']['count'] ?? 0),
            'units' => $doneTotal,
        ];
    }
    usort($rows, fn($a, $b) => $b['xp'] <=> $a['xp']);
    $you = null;
    $board = [];
    foreach ($rows as $i => $r) {
        $isYou = $r['email'] === $auth['email'];
        if ($isYou) $you = ['rank' => $i + 1, 'xp' => $r['xp']];
        if ($i < 10) {
            $board[] = [
                'rank' => $i + 1,
                'you' => $isYou,
                'name' => $r['name'],
                'xp' => $r['xp'],
                'streak' => $r['streak'],
                'units' => $r['units'],
            ];
        }
    }
    respond(200, ['ok' => true, 'board' => $board, 'you' => $you, 'classSize' => count($rows)]);
}

if ($method === 'GET' && isset($_GET['all'])) {
    // Class overview — faculty (educator and up): one row per student.
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
    write_store($store, ['state' => $state, 'updatedAt' => gmdate('c')]);
    respond(200, ['ok' => true, 'updatedAt' => gmdate('c')]);
}

respond(405, ['error' => 'GET or PUT only.']);
