<?php
// The Quad: the part of the school that is other people.
//
// A club is a room with its own feed, its own members and its own posting
// rule. Course clubs are derived from the catalog, so the school never opens
// with an empty room and nothing here hard-codes a course title; house clubs
// live in the store and staff can add more.
//
// Reactions are named rather than emoji (Like, Celebrate, Insightful,
// Support) and the client draws them as line icons.
//
// What this deliberately does not do: invent a timeline. Unit completions
// carry no timestamp, so the feed is built only from things that can prove
// when they happened - posts, comments, kudos and passed finals.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

const POST_MIN = 3;
const POST_MAX = 1200;
const COMMENT_MAX = 600;
const QUAD_POSTS_PER_DAY = 20;
const FEED_MAX = 60;

// Named reactions. The order here is the order they are drawn.
const REACTIONS = ['like', 'celebrate', 'insightful', 'support'];
const POST_KINDS = ['discussion', 'question', 'win'];

// The house clubs, seeded once. Course clubs are not in here: they come from
// the catalog, because the server must never hold its own idea of the
// curriculum.
function seed_clubs(): array {
    return [
        'roll-call' => [
            'name' => 'Roll Call',
            'blurb' => 'New here? Say hello, and tell the class where you are starting from.',
            'tone' => 'acc',
            'course' => '',
            'staffOnly' => false,
            'order' => 1,
        ],
        'win-column' => [
            'name' => 'The Win Column',
            'blurb' => 'Something worked. Post it, however small. This is the room that keeps people going.',
            'tone' => 'lime',
            'course' => '',
            'staffOnly' => false,
            'order' => 2,
        ],
        'ask-the-class' => [
            'name' => 'Ask the Class',
            'blurb' => 'A question the units did not answer. Somebody here has been where you are.',
            'tone' => 'vio',
            'course' => '',
            'staffOnly' => false,
            'order' => 3,
        ],
        'field-notes' => [
            'name' => 'Field Notes',
            'blurb' => 'You did the thing. What actually happened? The unglamorous version helps most.',
            'tone' => 'coral',
            'course' => '',
            'staffOnly' => false,
            'order' => 4,
        ],
    ];
}

// Clubs, with a club per course folded in from the catalog on every read so
// a new course brings its room with it and a renamed one carries the name
// across. Membership and anything staff edited stays in the store.
function all_clubs(): array {
    $store = read_store('clubs');
    if ($store === []) {
        $store = seed_clubs();
        foreach ($store as $id => $c) {
            $store[$id]['created'] = gmdate('c');
            $store[$id]['members'] = [];
        }
        write_store('clubs', $store);
    }
    $order = 10;
    foreach (catalog()['courses'] as $c) {
        $slug = $c['slug'] ?? '';
        if ($slug === '') continue;
        $id = 'course-' . $slug;
        $existing = $store[$id] ?? [];
        $store[$id] = [
            'name' => $c['title'] ?? $slug,
            'blurb' => 'Everyone working through ' . ($c['title'] ?? $slug) . '. Chapter talk, stuck points, and what landed.',
            'tone' => $c['tone'] ?? 'acc',
            'course' => $slug,
            'staffOnly' => false,
            'order' => $order++,
            'created' => $existing['created'] ?? gmdate('c'),
            'members' => $existing['members'] ?? [],
        ];
    }
    uasort($store, fn($a, $b) => ($a['order'] ?? 99) <=> ($b['order'] ?? 99));
    return $store;
}

// A club you may open. Course clubs go through the one access gate, so
// turning payment on closes the room at the same moment it closes the course.
function club_open(array $club, string $email, array $user): bool {
    $course = $club['course'] ?? '';
    if ($course === '') return true;
    return course_access($email, $user, $course)['open'];
}

function club_row(string $id, array $club, string $email, array $user, array $counts): array {
    $members = $club['members'] ?? [];
    return [
        'id' => $id,
        'name' => $club['name'] ?? $id,
        'blurb' => $club['blurb'] ?? '',
        'tone' => $club['tone'] ?? 'acc',
        'course' => $club['course'] ?? '',
        'staffOnly' => !empty($club['staffOnly']),
        'members' => count($members),
        'joined' => in_array($email, $members, true),
        'open' => club_open($club, $email, $user),
        'posts' => $counts[$id] ?? 0,
    ];
}

// One post, shaped for the client. Emails never cross to students.
function post_row(string $id, array $p, string $email, bool $isFaculty): array {
    $reactions = [];
    $yours = [];
    foreach (REACTIONS as $r) {
        $list = $p['reactions'][$r] ?? [];
        $reactions[$r] = count($list);
        if (in_array($email, $list, true)) $yours[] = $r;
    }
    $comments = [];
    foreach ($p['comments'] ?? [] as $c) {
        $row = [
            'id' => $c['id'] ?? '',
            'name' => $c['name'] ?? 'Student',
            'text' => $c['text'] ?? '',
            'created' => $c['created'] ?? '',
            'mine' => ($c['email'] ?? '') === $email,
            'staff' => !empty($c['staff']),
        ];
        if ($isFaculty) $row['email'] = $c['email'] ?? '';
        $comments[] = $row;
    }
    usort($comments, fn($a, $b) => strcmp($a['created'], $b['created']));
    $row = [
        'id' => $id,
        'club' => $p['club'] ?? '',
        'name' => $p['name'] ?? 'Student',
        'text' => $p['text'] ?? '',
        'kind' => $p['kind'] ?? 'discussion',
        'created' => $p['created'] ?? '',
        'reactions' => $reactions,
        'yours' => $yours,
        'comments' => $comments,
        'pinned' => !empty($p['pinned']),
        'locked' => !empty($p['locked']),
        'staff' => !empty($p['staff']),
        'mine' => ($p['email'] ?? '') === $email,
    ];
    if ($isFaculty) {
        $row['email'] = $p['email'] ?? '';
        $row['reports'] = count($p['reports'] ?? []);
    }
    return $row;
}

$auth = require_auth();
$isFaculty = auth_rank($auth) >= ROLE_RANK['educator'];
$me = $auth['email'];
$method = $_SERVER['REQUEST_METHOD'] ?? '';

// ---------- reading ----------

if ($method === 'GET') {
    $clubs = all_clubs();
    $posts = read_store('quad');

    $counts = [];
    foreach ($posts as $p) {
        $c = $p['club'] ?? '';
        $counts[$c] = ($counts[$c] ?? 0) + 1;
    }

    // The room list.
    if (isset($_GET['clubs'])) {
        $rows = [];
        foreach ($clubs as $id => $club) {
            $rows[] = club_row($id, $club, $me, $auth['user'], $counts);
        }
        respond(200, ['ok' => true, 'clubs' => $rows]);
    }

    // One room.
    if (isset($_GET['club'])) {
        $id = (string)$_GET['club'];
        if (!isset($clubs[$id])) respond(404, ['error' => 'No such club.']);
        if (!club_open($clubs[$id], $me, $auth['user'])) {
            respond(403, ['error' => 'That club belongs to a course you have not enrolled in yet.']);
        }
        $rows = [];
        foreach ($posts as $pid => $p) {
            if (($p['club'] ?? '') !== $id) continue;
            $rows[] = post_row($pid, $p, $me, $isFaculty);
        }
        // Pinned first, then newest.
        usort($rows, function ($a, $b) {
            if ($a['pinned'] !== $b['pinned']) return $a['pinned'] ? -1 : 1;
            return strcmp($b['created'], $a['created']);
        });
        respond(200, [
            'ok' => true,
            'club' => club_row($id, $clubs[$id], $me, $auth['user'], $counts),
            'posts' => $rows,
        ]);
    }

    // Anything staff has been asked to look at.
    if (isset($_GET['reported'])) {
        require_rank($auth, ROLE_RANK['educator']);
        $rows = [];
        foreach ($posts as $pid => $p) {
            if (count($p['reports'] ?? []) === 0) continue;
            $row = post_row($pid, $p, $me, true);
            $row['clubName'] = $clubs[$p['club'] ?? '']['name'] ?? '';
            $rows[] = $row;
        }
        usort($rows, fn($a, $b) => $b['reports'] <=> $a['reports']);
        respond(200, ['ok' => true, 'posts' => $rows]);
    }

    // The feed: what has happened lately, in the rooms this person is in.
    //
    // Only events that can prove their own date are in here. Unit
    // completions are not one of them, and no amount of wanting a busier
    // feed makes them one.
    $mine = [];
    foreach ($clubs as $id => $club) {
        if (in_array($me, $club['members'] ?? [], true) && club_open($club, $me, $auth['user'])) {
            $mine[$id] = $club['name'] ?? $id;
        }
    }
    $events = [];
    foreach ($posts as $pid => $p) {
        $club = $p['club'] ?? '';
        if (!isset($mine[$club])) continue;
        $events[] = [
            'type' => 'post',
            'at' => $p['created'] ?? '',
            'name' => $p['name'] ?? 'Student',
            'club' => $club,
            'clubName' => $mine[$club],
            'kind' => $p['kind'] ?? 'discussion',
            'text' => mb_substr((string)($p['text'] ?? ''), 0, 220),
            'id' => $pid,
            'comments' => count($p['comments'] ?? []),
        ];
    }
    // Kudos are their own currency, written here, so they carry a date.
    $users = read_users();
    foreach (read_store('kudos') as $k) {
        $events[] = [
            'type' => 'kudos',
            'at' => $k['at'] ?? '',
            'name' => name_of($users, (string)($k['from'] ?? '')),
            'toName' => name_of($users, (string)($k['to'] ?? '')),
            'text' => $k['note'] ?? '',
            'yours' => ($k['to'] ?? '') === $me,
        ];
    }
    // Finishing a challenge is written down with its date when it happens,
    // so it can carry a place in the timeline honestly.
    foreach (read_store('challenges') as $c) {
        foreach ($c['joined'] ?? [] as $email => $j) {
            if (empty($j['done']) || ($j['doneAt'] ?? '') === '') continue;
            $events[] = [
                'type' => 'challenge',
                'at' => $j['doneAt'],
                'name' => name_of($users, (string)$email),
                'text' => $c['name'] ?? '',
                'yours' => $email === $me,
            ];
        }
    }
    // A passed final is server-graded, so the school knows when it happened.
    $titles = course_titles();
    foreach (read_store('finals') as $email => $courses) {
        if (!is_array($courses)) continue;
        foreach ($courses as $slug => $rec) {
            if (empty($rec['passed'])) continue;
            $events[] = [
                'type' => 'final',
                'at' => $rec['last'] ?? ($rec['first'] ?? ''),
                'name' => name_of($users, (string)$email),
                'text' => $titles[$slug] ?? $slug,
                'yours' => $email === $me,
            ];
        }
    }
    usort($events, fn($a, $b) => strcmp((string)$b['at'], (string)$a['at']));
    respond(200, [
        'ok' => true,
        'feed' => array_slice($events, 0, FEED_MAX),
        'clubs' => count($mine),
    ]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
$action = (string)($in['action'] ?? '');
$clubs = all_clubs();

// ---------- joining ----------

if ($action === 'join' || $action === 'leave') {
    $id = (string)($in['club'] ?? '');
    if (!isset($clubs[$id])) respond(404, ['error' => 'No such club.']);
    if (!club_open($clubs[$id], $me, $auth['user'])) {
        respond(403, ['error' => 'That club belongs to a course you have not enrolled in yet.']);
    }
    $store = read_store('clubs');
    // A course club may only exist in the catalog until somebody joins it.
    if (!isset($store[$id])) $store[$id] = $clubs[$id];
    $members = $store[$id]['members'] ?? [];
    $i = array_search($me, $members, true);
    if ($action === 'join' && $i === false) $members[] = $me;
    if ($action === 'leave' && $i !== false) array_splice($members, $i, 1);
    $store[$id]['members'] = array_values($members);
    write_store('clubs', $store);
    respond(200, ['ok' => true, 'joined' => $action === 'join', 'members' => count($members)]);
}

$posts = read_store('quad');

// ---------- writing ----------

if ($action === 'post') {
    $club = (string)($in['club'] ?? '');
    $text = trim((string)($in['text'] ?? ''));
    $kind = (string)($in['kind'] ?? 'discussion');
    if (!isset($clubs[$club])) respond(404, ['error' => 'No such club.']);
    if (!club_open($clubs[$club], $me, $auth['user'])) {
        respond(403, ['error' => 'That club belongs to a course you have not enrolled in yet.']);
    }
    if (!empty($clubs[$club]['staffOnly']) && !$isFaculty) {
        respond(403, ['error' => 'Only faculty post in that club.']);
    }
    if (!in_array($kind, POST_KINDS, true)) $kind = 'discussion';
    if (mb_strlen($text) < POST_MIN || mb_strlen($text) > POST_MAX) {
        respond(400, ['error' => 'Keep it between ' . POST_MIN . ' and ' . POST_MAX . ' characters.']);
    }
    $today = gmdate('Y-m-d');
    $todayCount = 0;
    foreach ($posts as $p) {
        if (($p['email'] ?? '') === $me && str_starts_with((string)($p['created'] ?? ''), $today)) $todayCount++;
    }
    if ($todayCount >= QUAD_POSTS_PER_DAY && !$isFaculty) {
        respond(429, ['error' => 'That is plenty for one day. Let the class catch up.']);
    }
    $id = bin2hex(random_bytes(8));
    $posts[$id] = [
        'club' => $club,
        'email' => $me,
        'name' => $auth['user']['name'] ?? 'Student',
        'text' => $text,
        'kind' => $kind,
        'created' => gmdate('c'),
        'reactions' => [],
        'comments' => [],
        'reports' => [],
        'pinned' => false,
        'locked' => false,
        'staff' => $isFaculty,
    ];
    write_store('quad', $posts);
    // Posting in a room you have not joined joins you to it: nobody wants a
    // second click to hear the answers to their own question.
    $store = read_store('clubs');
    if (!isset($store[$club])) $store[$club] = $clubs[$club];
    $members = $store[$club]['members'] ?? [];
    if (!in_array($me, $members, true)) {
        $members[] = $me;
        $store[$club]['members'] = array_values($members);
        write_store('clubs', $store);
    }
    respond(200, ['ok' => true, 'id' => $id]);
}

// Everything below acts on a post that already exists.
$id = (string)($in['id'] ?? '');
if (!isset($posts[$id])) respond(404, ['error' => 'Post not found.']);
$post = $posts[$id];
if (!club_open($clubs[$post['club'] ?? ''] ?? [], $me, $auth['user'])) {
    respond(403, ['error' => 'That club belongs to a course you have not enrolled in yet.']);
}

if ($action === 'comment') {
    $text = trim((string)($in['text'] ?? ''));
    if (!empty($post['locked']) && !$isFaculty) respond(403, ['error' => 'That thread is closed.']);
    if (mb_strlen($text) < POST_MIN || mb_strlen($text) > COMMENT_MAX) {
        respond(400, ['error' => 'Keep it between ' . POST_MIN . ' and ' . COMMENT_MAX . ' characters.']);
    }
    $comments = $post['comments'] ?? [];
    $comments[] = [
        'id' => bin2hex(random_bytes(6)),
        'email' => $me,
        'name' => $auth['user']['name'] ?? 'Student',
        'text' => $text,
        'created' => gmdate('c'),
        'staff' => $isFaculty,
    ];
    $posts[$id]['comments'] = $comments;
    write_store('quad', $posts);
    // The author hears about it; a room full of other repliers does not.
    if (($post['email'] ?? '') !== $me) {
        notify(
            (string)$post['email'],
            'reply',
            ($auth['user']['name'] ?? 'Somebody') . ' replied to your post in ' . ($clubs[$post['club'] ?? '']['name'] ?? 'the Quad') . '.',
            '/learn/quad/'
        );
    }
    respond(200, ['ok' => true]);
}

if ($action === 'react') {
    $kind = (string)($in['reaction'] ?? '');
    if (!in_array($kind, REACTIONS, true)) respond(400, ['error' => 'Unknown reaction.']);
    if (($post['email'] ?? '') === $me) {
        respond(400, ['error' => 'Reacting to yourself is a mindset unit all its own.']);
    }
    $list = $post['reactions'][$kind] ?? [];
    $i = array_search($me, $list, true);
    if ($i === false) $list[] = $me;
    else array_splice($list, $i, 1);
    $posts[$id]['reactions'][$kind] = array_values($list);
    write_store('quad', $posts);
    // Only on the way on. Toggling off and on again is not an event.
    if ($i === false) {
        notify(
            (string)($post['email'] ?? ''),
            'reaction',
            ($auth['user']['name'] ?? 'Somebody') . ' reacted to your post in ' . ($clubs[$post['club'] ?? '']['name'] ?? 'the Quad') . '.',
            '/learn/quad/'
        );
    }
    respond(200, ['ok' => true, 'count' => count($list), 'on' => $i === false]);
}

if ($action === 'report') {
    $reports = $post['reports'] ?? [];
    if (!in_array($me, $reports, true)) $reports[] = $me;
    $posts[$id]['reports'] = array_values($reports);
    write_store('quad', $posts);
    respond(200, ['ok' => true]);
}

if ($action === 'clear-reports') {
    require_rank($auth, ROLE_RANK['educator']);
    $posts[$id]['reports'] = [];
    write_store('quad', $posts);
    audit_log($auth, 'quad.clear_reports', mb_substr((string)($post['text'] ?? ''), 0, 80), (string)($post['email'] ?? ''));
    respond(200, ['ok' => true]);
}

if ($action === 'pin' || $action === 'unpin') {
    require_rank($auth, ROLE_RANK['educator']);
    $posts[$id]['pinned'] = $action === 'pin';
    write_store('quad', $posts);
    respond(200, ['ok' => true]);
}

if ($action === 'lock' || $action === 'unlock') {
    require_rank($auth, ROLE_RANK['educator']);
    $posts[$id]['locked'] = $action === 'lock';
    write_store('quad', $posts);
    respond(200, ['ok' => true]);
}

if ($action === 'delete') {
    $mine = ($post['email'] ?? '') === $me;
    if (!$mine) require_rank($auth, ROLE_RANK['educator']);
    if (!$mine) {
        audit_log($auth, 'quad.remove', mb_substr((string)($post['text'] ?? ''), 0, 80), (string)($post['email'] ?? ''));
    }
    unset($posts[$id]);
    write_store('quad', $posts);
    respond(200, ['ok' => true]);
}

if ($action === 'delete-comment') {
    $cid = (string)($in['comment'] ?? '');
    $comments = $post['comments'] ?? [];
    $found = null;
    foreach ($comments as $i => $c) {
        if (($c['id'] ?? '') === $cid) { $found = $i; break; }
    }
    if ($found === null) respond(404, ['error' => 'Comment not found.']);
    $mine = ($comments[$found]['email'] ?? '') === $me;
    if (!$mine) require_rank($auth, ROLE_RANK['educator']);
    if (!$mine) {
        audit_log($auth, 'quad.remove_comment', mb_substr((string)($comments[$found]['text'] ?? ''), 0, 80), (string)($comments[$found]['email'] ?? ''));
    }
    array_splice($comments, $found, 1);
    $posts[$id]['comments'] = array_values($comments);
    write_store('quad', $posts);
    respond(200, ['ok' => true]);
}

respond(400, ['error' => 'Unknown action.']);
