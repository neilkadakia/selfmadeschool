<?php
// Per-user LMS progress: one JSON blob per account.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

$auth = require_auth();
$store = 'progress_' . sha1($auth['email']);
$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET' && isset($_GET['all'])) {
    // Class overview — admin only: one row per student, from their synced state.
    if (($auth['user']['role'] ?? '') !== 'admin') respond(403, ['error' => 'Admin only.']);
    $users = read_store('users');
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
