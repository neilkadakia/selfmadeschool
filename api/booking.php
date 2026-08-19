<?php
// One-on-one time with an instructor.
//
// Office Hours (sessions.php) is a room with seats. This is the other half:
// a teacher publishes the times they are free, and exactly one student takes
// each of them. Deliberately not a calendar integration and not a scheduling
// product; it is a list of times somebody can say yes to.
//
// Two rules shape it:
//   A slot is one person's. There is no waitlist, because "you and me at four"
//   stops meaning anything the moment it is three people.
//   The join link reaches the two people in the room and nobody else, the same
//   rule Office Hours already follows.
//
// Behind the `oneOnOne` switch, off until somebody turns it on, like every
// other optional room.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

const SLOT_MIN = 15;
const SLOT_MAX = 120;
/** How far ahead a teacher may publish, so the list cannot become a calendar. */
const HORIZON_DAYS = 90;

$settings = read_settings();
if (empty($settings['features']['oneOnOne'])) respond(404, ['error' => 'Not found.']);

$auth = require_auth();
$email = $auth['email'];
$isFaculty = auth_rank($auth) >= ROLE_RANK['educator'];
$method = $_SERVER['REQUEST_METHOD'] ?? '';
$all = read_store('booking');

function mail_out(string $to, string $subject, string $body): void {
    $headers = "From: Self Made School <noreply@selfmadeschool.org>\r\n"
        . "Content-Type: text/plain; charset=utf-8";
    @mail($to, $subject, $body, $headers);
}

function when_line(string $iso): string {
    return date('m-d-Y \a\t g:i A T', strtotime($iso) ?: time());
}

function slot_row(string $id, array $s, string $viewer, bool $isFaculty, array $users): array {
    $taken = (string)($s['takenBy'] ?? '');
    $mine = $taken !== '' && $taken === $viewer;
    $host = (string)($s['educator'] ?? '');
    $row = [
        'id' => $id,
        'educator' => $host,
        'educatorName' => $users[$host]['name'] ?? 'Your instructor',
        'startsAt' => $s['startsAt'] ?? '',
        'durationMin' => (int)($s['durationMin'] ?? 30),
        'mine' => $mine,
        'taken' => $taken !== '',
    ];
    // Who booked it is the teacher's business and the student's own. It is
    // nobody else's, so it is not in the row a third student receives.
    if ($mine || ($isFaculty && $host === $viewer)) {
        $row['topic'] = (string)($s['topic'] ?? '');
        if ($taken !== '') $row['takenByName'] = $users[$taken]['name'] ?? 'A student';
        if (!empty($s['link'])) $row['link'] = $s['link'];
    }
    return $row;
}

// ---------- reading ----------

if ($method === 'GET') {
    $users = read_users();
    $now = time();
    $open = [];
    $mine = [];
    foreach ($all as $id => $s) {
        $ends = strtotime((string)($s['startsAt'] ?? '')) + ((int)($s['durationMin'] ?? 30)) * 60;
        if ($ends < $now) continue; // past appointments stay out of the way
        $row = slot_row($id, $s, $email, $isFaculty, $users);
        if ($row['mine']) $mine[] = $row;
        // A teacher sees their own whole book; a student sees what is free.
        if ($isFaculty && ($s['educator'] ?? '') === $email) $open[] = $row;
        elseif (!$row['taken']) $open[] = $row;
    }
    $sort = fn($a, $b) => strcmp($a['startsAt'], $b['startsAt']);
    usort($open, $sort);
    usort($mine, $sort);
    respond(200, ['ok' => true, 'slots' => $open, 'mine' => $mine]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
$action = (string)($in['action'] ?? '');

// ---------- a teacher publishes times ----------

if ($action === 'open') {
    require_rank($auth, ROLE_RANK['educator']);
    $startsAt = trim((string)($in['startsAt'] ?? ''));
    $duration = $in['durationMin'] ?? 30;
    $link = trim((string)($in['link'] ?? ''));
    $ts = strtotime($startsAt);
    if ($ts === false || $ts < time()) respond(400, ['error' => 'Start time must be a real moment in the future.']);
    if ($ts > time() + HORIZON_DAYS * 86400) respond(400, ['error' => 'That is further out than this list goes.']);
    if (!is_int($duration) || $duration < SLOT_MIN || $duration > SLOT_MAX) {
        respond(400, ['error' => 'Length must be ' . SLOT_MIN . '-' . SLOT_MAX . ' minutes.']);
    }
    if ($link !== '' && !filter_var($link, FILTER_VALIDATE_URL)) respond(400, ['error' => 'That join link is not a URL.']);

    // Two of your own slots must not overlap: you cannot be in both.
    $newEnd = $ts + $duration * 60;
    foreach ($all as $s) {
        if (($s['educator'] ?? '') !== $email) continue;
        $a = strtotime((string)($s['startsAt'] ?? ''));
        $b = $a + ((int)($s['durationMin'] ?? 30)) * 60;
        if ($ts < $b && $a < $newEnd) respond(409, ['error' => 'That overlaps a time you have already opened.']);
    }

    $id = bin2hex(random_bytes(8));
    $all[$id] = [
        'educator' => $email,
        'startsAt' => gmdate('c', $ts),
        'durationMin' => $duration,
        'link' => $link,
        'created' => gmdate('c'),
        'takenBy' => '',
        'topic' => '',
    ];
    write_store('booking', $all);
    respond(200, ['ok' => true, 'id' => $id]);
}

// Everything below acts on one existing slot.
$id = (string)($in['id'] ?? '');
if (!isset($all[$id])) respond(404, ['error' => 'That time is no longer listed.']);
$slot = $all[$id];

// ---------- a student takes one ----------

if ($action === 'book') {
    if (strtotime((string)($slot['startsAt'] ?? '')) < time()) respond(409, ['error' => 'That time has passed.']);
    if (($slot['takenBy'] ?? '') !== '') {
        respond(409, ['error' => 'Somebody just took that one. The list has the rest.']);
    }
    $topic = trim((string)($in['topic'] ?? ''));
    if (mb_strlen($topic) > 400) respond(400, ['error' => 'Keep the topic under 400 characters.']);

    // One booking at a time per student. Not a rule about scarcity: somebody
    // holding six one-on-ones has a different problem than a booking system.
    foreach ($all as $sid => $s) {
        if (($s['takenBy'] ?? '') !== $email) continue;
        if (strtotime((string)($s['startsAt'] ?? '')) > time()) {
            respond(409, ['error' => 'You already have one booked. Cancel that first.']);
        }
    }

    $slot['takenBy'] = $email;
    $slot['topic'] = $topic;
    $slot['bookedAt'] = gmdate('c');
    $all[$id] = $slot;
    write_store('booking', $all);

    $users = read_users();
    $row = slot_row($id, $slot, $email, false, $users);
    $teacher = (string)$slot['educator'];
    $studentName = $users[$email]['name'] ?? 'A student';
    notify($teacher, 'booking', "$studentName booked your one-on-one on " . when_line((string)$slot['startsAt']), '/learn/faculty');

    // The teacher hears about it after the student has their answer.
    respond_then(200, ['ok' => true, 'slot' => $row], function () use ($teacher, $studentName, $slot, $topic) {
        $when = when_line((string)$slot['startsAt']);
        mail_out(
            $teacher,
            "One-on-one booked: $when",
            "$studentName booked your one-on-one on $when.\n\n"
            . ($topic !== '' ? "What they want to cover:\n$topic\n\n" : "They did not say what they want to cover.\n\n")
            . "It is in your book at https://selfmadeschool.org/learn/faculty\n"
        );
    });
}

// ---------- either side lets it go ----------

if ($action === 'cancel') {
    $taken = (string)($slot['takenBy'] ?? '');
    $isHost = ($slot['educator'] ?? '') === $email;
    if ($taken !== $email && !$isHost) respond(403, ['error' => 'That is not yours to cancel.']);

    $users = read_users();
    $when = when_line((string)$slot['startsAt']);

    if ($isHost && $taken !== '') {
        // The teacher is calling it off: the slot goes away entirely, and the
        // student is told rather than finding an empty room.
        unset($all[$id]);
        write_store('booking', $all);
        $teacherName = $users[$email]['name'] ?? 'Your instructor';
        notify($taken, 'booking', "$teacherName cancelled your one-on-one on $when", '/learn');
        respond_then(200, ['ok' => true], function () use ($taken, $teacherName, $when) {
            mail_out(
                $taken,
                "Cancelled: your one-on-one on $when",
                "$teacherName had to cancel the one-on-one on $when.\n\n"
                . "Other times are in the classroom: https://selfmadeschool.org/learn\n"
            );
        });
    }

    if ($isHost) {
        // Nobody had taken it; just withdraw the offer.
        unset($all[$id]);
        write_store('booking', $all);
        respond(200, ['ok' => true]);
    }

    // The student is giving the time back. It returns to the list.
    $slot['takenBy'] = '';
    $slot['topic'] = '';
    unset($slot['bookedAt']);
    $all[$id] = $slot;
    write_store('booking', $all);
    $studentName = $users[$email]['name'] ?? 'A student';
    $teacher = (string)$slot['educator'];
    notify($teacher, 'booking', "$studentName gave back the one-on-one on $when", '/learn/faculty');
    respond_then(200, ['ok' => true], function () use ($teacher, $studentName, $when) {
        mail_out(
            $teacher,
            "Given back: one-on-one on $when",
            "$studentName cancelled the one-on-one on $when, so that time is open again.\n"
        );
    });
}

if ($action === 'delete') {
    require_rank($auth, ROLE_RANK['educator']);
    if (($slot['educator'] ?? '') !== $email) require_rank($auth, ROLE_RANK['admin']);
    unset($all[$id]);
    write_store('booking', $all);
    respond(200, ['ok' => true]);
}

respond(400, ['error' => 'Unknown action.']);
