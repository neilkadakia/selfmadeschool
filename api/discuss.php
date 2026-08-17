<?php
// Study Group: one discussion thread per unit. Students post and upvote,
// faculty endorse the good answers ("Faculty answer") and can take posts
// down. Names and text only; emails stay faculty-side. Signed-in only.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

const POST_MIN = 3;
const POST_MAX = 500;
const POSTS_PER_DAY = 15;

// Known course/unit pairs come from the same build artifact the Registrar
// grades with, so nobody opens threads on units that don't exist.
function known_unit(string $course, string $unit): bool {
    $raw = @file_get_contents(__DIR__ . '/final-keys.json');
    $keys = json_decode($raw ?: '', true);
    $units = $keys['courses'][$course]['units'] ?? null;
    return is_array($units) && in_array($unit, $units, true);
}

$auth = require_auth();
$isFaculty = auth_rank($auth) >= ROLE_RANK['educator'];
$method = $_SERVER['REQUEST_METHOD'] ?? '';
$all = read_store('discuss');

// The faculty feed: every post in the school, one list, newest first, so
// answering the class doesn't mean walking into thirty separate threads.
// Filters: waiting (no member of staff has posted in that thread yet),
// endorsed, or all.
if ($method === 'GET' && isset($_GET['feed'])) {
    require_rank($auth, ROLE_RANK['educator']);
    $users = read_users();
    $titles = course_titles();
    $filter = $_GET['filter'] ?? 'waiting';

    $staff = [];
    foreach ($users as $e => $u) {
        if (role_rank($u['role'] ?? 'student') >= ROLE_RANK['educator']) $staff[$e] = true;
    }
    // Which threads a teacher has already spoken in.
    $answered = [];
    foreach ($all as $p) {
        if (isset($staff[$p['email'] ?? ''])) {
            $answered[($p['course'] ?? '') . '/' . ($p['unit'] ?? '')] = true;
        }
    }

    $rows = [];
    $counts = ['waiting' => 0, 'endorsed' => 0, 'all' => 0];
    foreach ($all as $id => $p) {
        $thread = ($p['course'] ?? '') . '/' . ($p['unit'] ?? '');
        $fromStaff = isset($staff[$p['email'] ?? '']);
        $waiting = !$fromStaff && empty($p['endorsed']) && !isset($answered[$thread]);
        $counts['all']++;
        if ($waiting) $counts['waiting']++;
        if (!empty($p['endorsed'])) $counts['endorsed']++;
        if ($filter === 'waiting' && !$waiting) continue;
        if ($filter === 'endorsed' && empty($p['endorsed'])) continue;
        $unit = catalog_unit((string)($p['course'] ?? ''), (string)($p['unit'] ?? ''));
        $rows[] = [
            'id' => $id,
            'email' => $p['email'] ?? '',
            'name' => $p['name'] ?? 'Student',
            'text' => $p['text'] ?? '',
            'created' => $p['created'] ?? '',
            'ups' => count($p['up'] ?? []),
            'endorsed' => !empty($p['endorsed']),
            'fromStaff' => $fromStaff,
            'answered' => isset($answered[$thread]),
            'course' => $p['course'] ?? '',
            'courseTitle' => $titles[$p['course'] ?? ''] ?? '',
            'unit' => $p['unit'] ?? '',
            'unitTitle' => $unit['title'] ?? ($p['unit'] ?? ''),
        ];
    }
    usort($rows, fn($a, $b) => strcmp($b['created'], $a['created']));
    respond(200, ['ok' => true, 'posts' => array_slice($rows, 0, 200), 'counts' => $counts]);
}

if ($method === 'GET') {
    $course = trim($_GET['course'] ?? '');
    $unit = trim($_GET['unit'] ?? '');
    if (!known_unit($course, $unit)) respond(400, ['error' => 'Unknown unit.']);
    $list = [];
    foreach ($all as $id => $p) {
        if (($p['course'] ?? '') !== $course || ($p['unit'] ?? '') !== $unit) continue;
        $ups = $p['up'] ?? [];
        $row = [
            'id' => $id,
            'name' => $p['name'] ?? 'Student',
            'text' => $p['text'] ?? '',
            'created' => $p['created'] ?? '',
            'ups' => count($ups),
            'youUp' => in_array($auth['email'], $ups, true),
            'endorsed' => (bool)($p['endorsed'] ?? false),
            'mine' => ($p['email'] ?? '') === $auth['email'],
        ];
        if ($isFaculty) $row['email'] = $p['email'] ?? '';
        $list[] = $row;
    }
    usort($list, fn($a, $b) => strcmp($a['created'], $b['created']));
    respond(200, ['ok' => true, 'posts' => $list]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
$action = $in['action'] ?? '';

if ($action === 'post') {
    $course = trim($in['course'] ?? '');
    $unit = trim($in['unit'] ?? '');
    $text = trim($in['text'] ?? '');
    if (!known_unit($course, $unit)) respond(400, ['error' => 'Unknown unit.']);
    if (mb_strlen($text) < POST_MIN || mb_strlen($text) > POST_MAX) {
        respond(400, ['error' => 'Keep it between ' . POST_MIN . ' and ' . POST_MAX . ' characters.']);
    }
    // Flood guard: a class discussion, not a feed.
    $today = gmdate('Y-m-d');
    $mine = 0;
    foreach ($all as $p) {
        if (($p['email'] ?? '') === $auth['email'] && str_starts_with($p['created'] ?? '', $today)) $mine++;
    }
    if ($mine >= POSTS_PER_DAY) respond(429, ['error' => 'That\'s plenty for one day. Let the class catch up.']);
    $id = bin2hex(random_bytes(8));
    $all[$id] = [
        'course' => $course,
        'unit' => $unit,
        'email' => $auth['email'],
        'name' => $auth['user']['name'] ?? 'Student',
        'text' => $text,
        'created' => gmdate('c'),
        'up' => [],
        'endorsed' => false,
    ];
    write_store('discuss', $all);
    respond(200, ['ok' => true, 'id' => $id]);
}

// Everything below operates on an existing post.
$id = (string)($in['id'] ?? '');
if (!isset($all[$id])) respond(404, ['error' => 'Post not found.']);

if ($action === 'upvote') {
    if (($all[$id]['email'] ?? '') === $auth['email']) {
        respond(400, ['error' => 'Upvoting yourself is a mindset unit all its own.']);
    }
    $ups = $all[$id]['up'] ?? [];
    $i = array_search($auth['email'], $ups, true);
    if ($i === false) $ups[] = $auth['email'];
    else array_splice($ups, $i, 1);
    $all[$id]['up'] = array_values($ups);
    write_store('discuss', $all);
    respond(200, ['ok' => true, 'ups' => count($ups)]);
}

if ($action === 'endorse' || $action === 'unendorse') {
    require_rank($auth, ROLE_RANK['educator']);
    $all[$id]['endorsed'] = $action === 'endorse';
    write_store('discuss', $all);
    // Being marked as the answer worth keeping is the best thing that
    // happens in the Study Group. Say so.
    if ($action === 'endorse' && ($all[$id]['email'] ?? '') !== $auth['email']) {
        $unit = catalog_unit((string)($all[$id]['course'] ?? ''), (string)($all[$id]['unit'] ?? ''));
        notify(
            (string)($all[$id]['email'] ?? ''),
            'endorsed',
            'Faculty marked your answer in ' . ($unit['title'] ?? 'the Study Group') . ' as the one worth keeping.',
            '/learn/' . ($all[$id]['course'] ?? '') . '/' . ($all[$id]['unit'] ?? '') . '/'
        );
    }
    respond(200, ['ok' => true]);
}

if ($action === 'delete') {
    $mine = ($all[$id]['email'] ?? '') === $auth['email'];
    if (!$mine) require_rank($auth, ROLE_RANK['educator']);
    // Taking down somebody else's words is on the record.
    if (!$mine) {
        audit_log($auth, 'discuss.remove', mb_substr((string)($all[$id]['text'] ?? ''), 0, 80), (string)($all[$id]['email'] ?? ''));
    }
    unset($all[$id]);
    write_store('discuss', $all);
    respond(200, ['ok' => true]);
}

respond(400, ['error' => 'Unknown action.']);
