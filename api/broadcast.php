<?php
// One composer, one audience, one record of who it reached.
//
// The school could already speak in three ways: the Bulletin (a note on the
// wall), the nudge desk (a robot, on a schedule) and Field Work replies (one
// person). None of them is "tell these particular people this particular
// thing, now, and show me it landed".
//
// Two rules:
//
//   The bell always rings; email is opt-in per send and respects the same
//   nudgesOff switch students already have. Nobody gets mail from the school
//   because a member of staff forgot which box was ticked.
//
//   Every send keeps a delivery row per person. A broadcast you cannot audit
//   is a broadcast you cannot answer questions about later.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

const CAST_SUBJECT_MAX = 120;
const CAST_BODY_MAX = 2000;
const CAST_KEEP = 50;

$auth = require_auth();
$me = $auth['email'];
$method = $_SERVER['REQUEST_METHOD'] ?? '';

if (!feature_on('broadcast')) respond(404, ['error' => 'Broadcast is not switched on.']);
require_rank($auth, ROLE_RANK['educator']);

$all = read_store('broadcasts');

// Who a given audience actually resolves to, right now.
function audience_of(string $kind, string $value, string $sender): array {
    $users = read_users();
    $out = [];
    foreach ($users as $email => $u) {
        if ($email === $sender) continue;
        if (($u['role'] ?? 'student') !== 'student') continue;
        if ($kind === 'homeroom' && ($u['homeroom'] ?? '') !== $value) continue;
        if ($kind === 'course') {
            // Everyone who has finished at least one unit of it: the people
            // for whom a message about that course means something.
            $done = state_of((string)$email)['done'][$value] ?? [];
            if (!is_array($done) || count($done) === 0) continue;
        }
        $out[] = (string)$email;
    }
    return $out;
}

if ($method === 'GET') {
    // The composer needs to know what it can address, and the desk needs the
    // history. Counts are computed live so a preview is never stale.
    if (isset($_GET['audiences'])) {
        $rooms = [];
        foreach (read_store('homerooms') as $id => $r) {
            $rooms[] = [
                'id' => $id,
                'name' => is_array($r) ? ($r['name'] ?? $id) : $id,
                'count' => count(audience_of('homeroom', (string)$id, $me)),
            ];
        }
        $courses = [];
        foreach (catalog()['courses'] as $c) {
            $courses[] = [
                'slug' => $c['slug'],
                'title' => $c['title'] ?? $c['slug'],
                'count' => count(audience_of('course', (string)$c['slug'], $me)),
            ];
        }
        respond(200, [
            'ok' => true,
            'everyone' => count(audience_of('all', '', $me)),
            'homerooms' => $rooms,
            'courses' => $courses,
            'homeroomsOn' => feature_on('homerooms'),
        ]);
    }

    $rows = [];
    foreach ($all as $id => $b) {
        $rows[] = [
            'id' => $id,
            'subject' => $b['subject'] ?? '',
            'body' => $b['body'] ?? '',
            'audience' => $b['audience'] ?? 'all',
            'audienceName' => $b['audienceName'] ?? 'Everyone',
            'emailed' => !empty($b['emailed']),
            'sent' => $b['sent'] ?? '',
            'by' => $b['by'] ?? '',
            'reached' => count($b['deliveries'] ?? []),
            'mailed' => count(array_filter($b['deliveries'] ?? [], fn($d) => !empty($d['mailed']))),
            'optedOut' => count(array_filter($b['deliveries'] ?? [], fn($d) => !empty($d['optedOut']))),
        ];
    }
    usort($rows, fn($a, $b) => strcmp((string)$b['sent'], (string)$a['sent']));
    respond(200, ['ok' => true, 'broadcasts' => $rows]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
if (($in['action'] ?? '') !== 'send') respond(400, ['error' => 'Unknown action.']);

$subject = trim((string)($in['subject'] ?? ''));
$body = trim((string)($in['body'] ?? ''));
$kind = (string)($in['audience'] ?? 'all');
$value = trim((string)($in['value'] ?? ''));
$alsoEmail = !empty($in['email']);

if ($subject === '' || mb_strlen($subject) > CAST_SUBJECT_MAX) {
    respond(400, ['error' => 'Give it a subject, under ' . CAST_SUBJECT_MAX . ' characters.']);
}
if ($body === '' || mb_strlen($body) > CAST_BODY_MAX) {
    respond(400, ['error' => 'Say something, under ' . CAST_BODY_MAX . ' characters.']);
}
if (!in_array($kind, ['all', 'homeroom', 'course'], true)) respond(400, ['error' => 'Unknown audience.']);
if ($kind === 'homeroom' && !isset(read_store('homerooms')[$value])) {
    respond(404, ['error' => 'No such homeroom.']);
}
if ($kind === 'course' && catalog_course($value) === null) {
    respond(404, ['error' => 'No such course.']);
}

$targets = audience_of($kind, $value, $me);
if (count($targets) === 0) respond(400, ['error' => 'That audience is empty right now.']);

$users = read_users();
$name = 'Everyone';
if ($kind === 'homeroom') {
    $room = read_store('homerooms')[$value] ?? [];
    $name = is_array($room) ? ($room['name'] ?? $value) : $value;
} elseif ($kind === 'course') {
    $name = (catalog_course($value)['title'] ?? $value);
}

// The bell rings for everybody in the audience, now.
$deliveries = [];
foreach ($targets as $email) {
    $optedOut = !empty($users[$email]['nudgesOff']);
    notify($email, 'broadcast', $subject, '/learn/');
    $deliveries[$email] = [
        'at' => gmdate('c'),
        'mailed' => $alsoEmail && !$optedOut,
        'optedOut' => $alsoEmail && $optedOut,
    ];
}

$id = bin2hex(random_bytes(8));
$all[$id] = [
    'subject' => $subject,
    'body' => $body,
    'audience' => $kind,
    'audienceName' => $name,
    'emailed' => $alsoEmail,
    'sent' => gmdate('c'),
    'by' => $auth['user']['name'] ?? $me,
    'deliveries' => $deliveries,
];
// Keep the log a file you can open.
if (count($all) > CAST_KEEP) {
    uasort($all, fn($a, $b) => strcmp((string)$b['sent'], (string)$a['sent']));
    $all = array_slice($all, 0, CAST_KEEP, true);
}
write_store('broadcasts', $all);
audit_log($auth, 'broadcast.send', $subject . ' → ' . $name . ' (' . count($targets) . ')');

$mailed = array_keys(array_filter($deliveries, fn($d) => !empty($d['mailed'])));
$result = [
    'ok' => true,
    'id' => $id,
    'reached' => count($targets),
    'mailed' => count($mailed),
    'optedOut' => count(array_filter($deliveries, fn($d) => !empty($d['optedOut']))),
];

if (count($mailed) === 0) respond(200, $result);

// Nobody waits on the mail server; the bell has already rung.
respond_then(200, $result, function () use ($mailed, $subject, $body) {
    $headers = "From: Self Made School <noreply@selfmadeschool.org>\r\n"
        . "Content-Type: text/plain; charset=utf-8";
    foreach ($mailed as $email) {
        @mail(
            $email,
            $subject,
            $body . "\n\n-- \nSelf Made School · selfmadeschool.org\n"
                . "You can switch these off in your Student File.\n",
            $headers
        );
    }
});
