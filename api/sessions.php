<?php
// Office Hours: live sessions with real seats. Faculty schedule them;
// students RSVP until capacity, then join a waitlist that auto-promotes
// (with an email) the moment a seat opens. The join link is only ever
// sent to people holding a seat.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

$auth = require_auth();
$isFaculty = auth_rank($auth) >= ROLE_RANK['educator'];
$method = $_SERVER['REQUEST_METHOD'] ?? '';
$all = read_store('sessions');

function session_row(string $id, array $s, string $email, bool $isFaculty): array {
    $rsvps = $s['rsvps'] ?? [];
    $wait = $s['waitlist'] ?? [];
    $in = in_array($email, $rsvps, true);
    $wl = array_search($email, $wait, true);
    $row = [
        'id' => $id,
        'title' => $s['title'] ?? '',
        'blurb' => $s['blurb'] ?? '',
        'startsAt' => $s['startsAt'] ?? '',
        'durationMin' => (int)($s['durationMin'] ?? 60),
        'capacity' => (int)($s['capacity'] ?? 0),
        'seats' => count($rsvps),
        'waiting' => count($wait),
        'host' => $s['host'] ?? '',
        'you' => $in ? 'in' : ($wl !== false ? 'waitlist' : null),
        'waitSpot' => $wl === false ? null : $wl + 1,
    ];
    // The link is a seat-holder's privilege (faculty always see it).
    if (($in || $isFaculty) && !empty($s['link'])) $row['link'] = $s['link'];
    if ($isFaculty) {
        $row['rsvps'] = array_values($rsvps);
        $row['waitlist'] = array_values($wait);
    }
    return $row;
}

function promote_next(string $id, array &$s): void {
    $wait = $s['waitlist'] ?? [];
    if (count($wait) === 0 || count($s['rsvps'] ?? []) >= (int)($s['capacity'] ?? 0)) return;
    $lucky = array_shift($wait);
    $s['waitlist'] = array_values($wait);
    $s['rsvps'][] = $lucky;
    $when = date('m-d-Y \a\t g:i A T', strtotime($s['startsAt'] ?? 'now'));
    $body = "Good news — a seat opened up in \"{$s['title']}\" and it's yours.\n\n"
        . "When: {$when}\n"
        . (!empty($s['link']) ? "Join link: {$s['link']}\n" : '')
        . "\nSee it in the classroom: https://selfmadeschool.org/learn\n"
        . "\n—\nSelf Made School · selfmadeschool.org\n";
    $headers = "From: Self Made School <noreply@selfmadeschool.org>\r\n"
        . "Content-Type: text/plain; charset=utf-8";
    @mail($lucky, "You're in: {$s['title']}", $body, $headers);
}

if ($method === 'GET') {
    $now = time();
    $rows = [];
    foreach ($all as $id => $s) {
        $ends = strtotime($s['startsAt'] ?? '') + ((int)($s['durationMin'] ?? 60)) * 60;
        if ($ends < $now) continue; // history stays out of the way
        $rows[] = session_row($id, $s, $auth['email'], $isFaculty);
    }
    usort($rows, fn($a, $b) => strcmp($a['startsAt'], $b['startsAt']));
    respond(200, ['ok' => true, 'sessions' => $rows]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
$action = $in['action'] ?? '';

if ($action === 'create') {
    require_rank($auth, ROLE_RANK['educator']);
    $title = trim($in['title'] ?? '');
    $blurb = trim($in['blurb'] ?? '');
    $link = trim($in['link'] ?? '');
    $startsAt = trim($in['startsAt'] ?? '');
    $capacity = $in['capacity'] ?? 0;
    $duration = $in['durationMin'] ?? 60;
    if (mb_strlen($title) < 3 || mb_strlen($title) > 80) respond(400, ['error' => 'Title must be 3-80 characters.']);
    if (mb_strlen($blurb) > 240) respond(400, ['error' => 'Blurb tops out at 240 characters.']);
    $ts = strtotime($startsAt);
    if ($ts === false || $ts < time()) respond(400, ['error' => 'Start time must be a real moment in the future.']);
    if (!is_int($capacity) || $capacity < 1 || $capacity > 500) respond(400, ['error' => 'Capacity must be 1-500.']);
    if (!is_int($duration) || $duration < 15 || $duration > 240) respond(400, ['error' => 'Duration must be 15-240 minutes.']);
    if ($link !== '' && !filter_var($link, FILTER_VALIDATE_URL)) respond(400, ['error' => 'That join link is not a URL.']);
    $id = bin2hex(random_bytes(8));
    $all[$id] = [
        'title' => $title,
        'blurb' => $blurb,
        'link' => $link,
        'startsAt' => gmdate('c', $ts),
        'durationMin' => $duration,
        'capacity' => $capacity,
        'host' => $auth['user']['name'] ?? '',
        'created' => gmdate('c'),
        'rsvps' => [],
        'waitlist' => [],
    ];
    write_store('sessions', $all);
    respond(200, ['ok' => true, 'id' => $id]);
}

// Everything below operates on an existing session.
$id = (string)($in['id'] ?? '');
if (!isset($all[$id])) respond(404, ['error' => 'Session not found.']);
$s = $all[$id];

if ($action === 'rsvp') {
    $email = $auth['email'];
    if (in_array($email, $s['rsvps'] ?? [], true) || in_array($email, $s['waitlist'] ?? [], true)) {
        respond(200, ['ok' => true] + ['session' => session_row($id, $s, $email, $isFaculty)]);
    }
    if (count($s['rsvps'] ?? []) < (int)$s['capacity']) $s['rsvps'][] = $email;
    else $s['waitlist'][] = $email;
    $all[$id] = $s;
    write_store('sessions', $all);
    respond(200, ['ok' => true, 'session' => session_row($id, $s, $email, $isFaculty)]);
}

if ($action === 'cancel') {
    $email = $auth['email'];
    $hadSeat = in_array($email, $s['rsvps'] ?? [], true);
    $s['rsvps'] = array_values(array_diff($s['rsvps'] ?? [], [$email]));
    $s['waitlist'] = array_values(array_diff($s['waitlist'] ?? [], [$email]));
    if ($hadSeat) promote_next($id, $s);
    $all[$id] = $s;
    write_store('sessions', $all);
    respond(200, ['ok' => true, 'session' => session_row($id, $s, $email, $isFaculty)]);
}

if ($action === 'delete') {
    require_rank($auth, ROLE_RANK['educator']);
    // Tell the people who were holding seats.
    foreach (($s['rsvps'] ?? []) as $email) {
        $headers = "From: Self Made School <noreply@selfmadeschool.org>\r\n"
            . "Content-Type: text/plain; charset=utf-8";
        @mail($email, "Cancelled: {$s['title']}",
            "Office Hours \"{$s['title']}\" was cancelled. If it gets rescheduled, "
            . "you'll see it in the classroom first: https://selfmadeschool.org/learn\n",
            $headers);
    }
    unset($all[$id]);
    write_store('sessions', $all);
    respond(200, ['ok' => true]);
}

respond(400, ['error' => 'Unknown action.']);
