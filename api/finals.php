<?php
// The Registrar: server-graded finals. The client runs the exam UI and
// submits an answer sheet; grading happens here against api/final-keys.json
// (generated from the course data at build time, never web-served), and the
// passing record behind a certificate is one the school asserts, not a
// value the browser wrote into its own storage.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

function final_keys(): array {
    $raw = @file_get_contents(__DIR__ . '/final-keys.json');
    $keys = json_decode($raw ?: '', true);
    if (!is_array($keys) || !isset($keys['courses'])) {
        respond(500, ['error' => 'The Registrar is missing the answer key. (final-keys.json not deployed.)']);
    }
    return $keys;
}

$auth = require_auth();
$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    // The caller's own server-verified finals, used by the certificate page
    // for the "Verified by the Registrar" mark.
    $all = read_store('finals');
    $out = ['ok' => true, 'finals' => (object)($all[$auth['email']] ?? [])];
    // The codes printed on this student's certificates, when the school is
    // handing out checkable ones. Issued only to the person they belong to.
    if (feature_on('certVerify')) {
        $codes = [];
        foreach (catalog()['courses'] as $c) {
            $slug = (string)($c['slug'] ?? '');
            if ($slug !== '') $codes[$slug] = verify_code($auth['email'], $slug);
        }
        $out['codes'] = $codes;
    }
    respond(200, $out);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

// Act As sessions observe; they don't sit finals for someone else.
if (!empty($auth['actor'])) {
    respond(403, ['error' => 'Act As sessions can\'t sit finals.']);
}

$keys = final_keys();
$in = body_json();
$course = (string)($in['course'] ?? '');
$picks = $in['picks'] ?? null;

$ck = $keys['courses'][$course] ?? null;
if (!$ck) respond(400, ['error' => 'Unknown course.']);

// Unlock check against the synced progress: same rule the client shows
// (every unit complete), enforced with the school's copy of the record.
$saved = read_store('progress_' . sha1($auth['email']));
$done = $saved['state']['done'][$course] ?? [];
$missing = array_diff($ck['units'], is_array($done) ? $done : []);
if (count($missing) > 0) {
    respond(409, [
        'error' => 'The Registrar shows ' . count($missing) . ' unit(s) incomplete. '
            . 'If you just finished, wait for your progress to sync and submit again.',
    ]);
}

$need = (int)$keys['questions'];
if (!is_array($picks) || count($picks) !== $need) {
    respond(400, ['error' => "An answer sheet has exactly {$need} answers."]);
}

$seen = [];
$score = 0;
foreach ($picks as $p) {
    $k = is_array($p) ? (string)($p['k'] ?? '') : '';
    $a = is_array($p) && is_int($p['a'] ?? null) ? $p['a'] : -1;
    // Question keys look like course/unit#index (lib/mastery.ts questionKey).
    if (!preg_match('/^' . preg_quote($course, '/') . '\/([a-z0-9-]+)#(\d+)$/', $k, $m)) {
        respond(400, ['error' => 'Malformed answer sheet.']);
    }
    if (isset($seen[$k])) respond(400, ['error' => 'Duplicate question on the answer sheet.']);
    $seen[$k] = true;
    $unit = $m[1];
    $idx = (int)$m[2];
    $key = $ck['answers'][$unit] ?? null;
    if ($key === null || !isset($key[$idx])) respond(400, ['error' => 'Unknown question on the answer sheet.']);
    if ($a === $key[$idx]) $score++;
}

$total = $need;
$passed = $score >= (int)$keys['pass'];
$now = gmdate('c');

$all = read_store('finals');
$prev = $all[$auth['email']][$course] ?? null;
$record = [
    'score' => max($score, (int)($prev['score'] ?? 0)),
    'total' => $total,
    'passed' => $passed || !empty($prev['passed']),
    'attempts' => (int)($prev['attempts'] ?? 0) + 1,
    'first' => $prev['first'] ?? $now,
    'last' => $now,
];
$all[$auth['email']][$course] = $record;
write_store('finals', $all);

respond(200, [
    'ok' => true,
    'score' => $score,
    'total' => $total,
    'passed' => $passed,
    'record' => $record,
]);
