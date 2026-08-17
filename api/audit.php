<?php
// The log book. Every staff action that touches somebody else's account,
// in order, newest first. Read-only: nothing in the app can edit or clear
// it, and an Act As session is recorded under the person really driving.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

$auth = require_auth();
require_rank($auth, ROLE_RANK['admin']);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') respond(405, ['error' => 'GET only.']);

$users = read_users();
$rows = read_store('audit')['rows'] ?? [];

$filter = strtolower(trim($_GET['q'] ?? ''));
$limit = max(1, min(500, (int)($_GET['limit'] ?? 200)));

$out = [];
foreach ($rows as $r) {
    if ($filter !== '') {
        $hay = strtolower(($r['actor'] ?? '') . ' ' . ($r['action'] ?? '') . ' '
            . ($r['subject'] ?? '') . ' ' . ($r['detail'] ?? ''));
        if (!str_contains($hay, $filter)) continue;
    }
    $out[] = [
        'at' => $r['at'] ?? '',
        'actor' => $r['actor'] ?? '',
        'actorName' => name_of($users, (string)($r['actor'] ?? '')),
        'as' => $r['as'] ?? '',
        'asName' => ($r['as'] ?? '') === '' ? '' : name_of($users, (string)$r['as']),
        'role' => $r['role'] ?? '',
        'action' => $r['action'] ?? '',
        'subject' => $r['subject'] ?? '',
        'subjectName' => ($r['subject'] ?? '') === '' || !isset($users[$r['subject']])
            ? ($r['subject'] ?? '')
            : name_of($users, (string)$r['subject']),
        'detail' => $r['detail'] ?? '',
    ];
    if (count($out) >= $limit) break;
}

respond(200, ['ok' => true, 'entries' => $out, 'total' => count($rows)]);
