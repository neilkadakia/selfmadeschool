<?php
// Nudge emails: the school checks in, once a day, one email max per
// student. Priorities: a streak about to die beats a waiting Final beats
// an almost-finished course beats a quiet week. Runs from Hostinger cron
// via secret key (same pattern as backup.php); the Global Administrator
// can run or dry-run it from School Ops. Students opt out in their
// Student File (users store field nudgesOff), and every email says how.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

const NUDGE_COOLDOWNS = [
    'streak' => 2,      // days
    'final' => 14,      // per course
    'almost' => 14,     // per course
    'winback' => 14,
];

// No student hears from the school two days running, whatever the reason.
// Without this, the priority ladder would cycle a fresh nudge type daily.
const NUDGE_GLOBAL_COOLDOWN = 2;

function nudge_key(): string {
    $ops = read_store('ops');
    if (empty($ops['nudgeKey'])) {
        $ops['nudgeKey'] = bin2hex(random_bytes(16));
        write_store('ops', $ops);
    }
    return $ops['nudgeKey'];
}

// The school runs on Pacific time, so day math must match the audience.
function school_day(int $offset = 0): string {
    $d = new DateTime('now', new DateTimeZone('America/Los_Angeles'));
    if ($offset !== 0) $d->modify("$offset day");
    return $d->format('Y-m-d');
}

function course_units_map(): array {
    $raw = @file_get_contents(__DIR__ . '/final-keys.json');
    $keys = json_decode($raw ?: '', true);
    $map = [];
    foreach (($keys['courses'] ?? []) as $slug => $c) $map[$slug] = $c['units'] ?? [];
    return $map;
}

const COURSE_TITLES = [
    'the-13th-grade' => 'The 13th Grade',
    'the-14th-grade' => 'The 14th Grade',
    'the-15th-grade' => 'The 15th Grade',
];

// Decide the single best nudge for one student, or null.
function pick_nudge(string $email, array $user, array $courseUnits, array $finals, array $sent): ?array {
    $saved = read_store('progress_' . sha1($email));
    $state = $saved['state'] ?? null;
    if (!is_array($state)) return null;

    $today = school_day();
    $yesterday = school_day(-1);
    $first = trim($user['first'] ?? '') ?: strtok($user['name'] ?? 'there', ' ');
    $daysSince = fn(?string $day): float =>
        $day === null ? INF : (strtotime(school_day()) - strtotime($day)) / 86400;
    if ($daysSince($sent['_any'] ?? null) < NUDGE_GLOBAL_COOLDOWN) return null;
    $okToSend = function (string $type, ?string $course = null) use ($sent, $daysSince): bool {
        $key = $course === null ? $type : "$type:$course";
        return $daysSince($sent[$key] ?? null) >= NUDGE_COOLDOWNS[$type];
    };

    // 1. The streak dies at midnight.
    $streak = (int)($state['streak']['count'] ?? 0);
    $streakLast = $state['streak']['last'] ?? '';
    if ($streak >= 2 && $streakLast === $yesterday && $okToSend('streak')) {
        return [
            'type' => 'streak',
            'course' => null,
            'subject' => "Your {$streak}-day streak dies at midnight",
            'body' => "{$first},\n\n"
                . "You've shown up {$streak} days in a row. Tonight that either becomes "
                . ($streak + 1) . " or it becomes zero. One unit takes about ten minutes.\n\n"
                . "Keep it alive: https://selfmadeschool.org/learn\n",
        ];
    }

    // 2. Every unit done, the Final untaken (or unpassed).
    foreach ($courseUnits as $slug => $units) {
        if (count($units) === 0) continue;
        $done = $state['done'][$slug] ?? [];
        if (count(array_diff($units, is_array($done) ? $done : [])) > 0) continue;
        if (!empty($finals[$email][$slug]['passed'])) continue;
        if (!$okToSend('final', $slug)) continue;
        $title = COURSE_TITLES[$slug] ?? $slug;
        return [
            'type' => 'final',
            'course' => $slug,
            'subject' => "Your Final is waiting: {$title}",
            'body' => "{$first},\n\n"
                . "Every unit of {$title}: done. The only thing between you and a certificate "
                . "that reads With Honors is twelve questions you already know the answers to.\n\n"
                . "Sit the Final: https://selfmadeschool.org/learn/final/?course={$slug}\n",
        ];
    }

    // 3. Close enough to taste the certificate.
    foreach ($courseUnits as $slug => $units) {
        $total = count($units);
        if ($total === 0) continue;
        $done = $state['done'][$slug] ?? [];
        $n = is_array($done) ? count(array_intersect($units, $done)) : 0;
        if ($n < $total * 0.75 || $n >= $total) continue;
        if (!$okToSend('almost', $slug)) continue;
        $left = $total - $n;
        $title = COURSE_TITLES[$slug] ?? $slug;
        return [
            'type' => 'almost',
            'course' => $slug,
            'subject' => "{$left} unit" . ($left === 1 ? '' : 's') . " from your certificate",
            'body' => "{$first},\n\n"
                . "{$n} of {$total} units of {$title}: that's the hard part, already behind you. "
                . "{$left} more and the certificate has your name on it.\n\n"
                . "Finish it: https://selfmadeschool.org/learn/{$slug}\n",
        ];
    }

    // 4. A quiet week.
    $updated = strtotime($saved['updatedAt'] ?? '') ?: 0;
    if ($updated > 0 && (time() - $updated) >= 7 * 86400 && $okToSend('winback')) {
        return [
            'type' => 'winback',
            'course' => null,
            'subject' => 'Class is still in session',
            'body' => "{$first},\n\n"
                . "It's been a week. No grades, no guilt. That's the whole point of this school. "
                . "But the version of you who enrolled had a reason. One unit, ten minutes, tonight?\n\n"
                . "Pick up where you left off: https://selfmadeschool.org/learn\n",
        ];
    }

    return null;
}

function run_nudges(bool $dry): array {
    $users = read_users();
    $courseUnits = course_units_map();
    $finals = read_store('finals');
    $log = read_store('nudges');
    $today = school_day();

    $sent = [];
    $skipped = 0;
    foreach ($users as $email => $user) {
        if (($user['role'] ?? 'student') !== 'student') continue;
        if (!empty($user['nudgesOff'])) {
            $skipped++;
            continue;
        }
        $nudge = pick_nudge($email, $user, $courseUnits, $finals, $log[$email] ?? []);
        if ($nudge === null) continue;
        $footer = "\n-- \nSelf Made School · selfmadeschool.org\n"
            . "Turn these emails off any time: https://selfmadeschool.org/learn/profile\n";
        if (!$dry) {
            $headers = "From: Self Made School <noreply@selfmadeschool.org>\r\n"
                . "Content-Type: text/plain; charset=utf-8";
            @mail($email, $nudge['subject'], $nudge['body'] . $footer, $headers);
            $key = $nudge['course'] === null ? $nudge['type'] : "{$nudge['type']}:{$nudge['course']}";
            $log[$email][$key] = $today;
            $log[$email]['_any'] = $today;
        }
        $sent[] = ['email' => $email, 'type' => $nudge['type'], 'subject' => $nudge['subject']];
    }

    if (!$dry) {
        write_store('nudges', $log);
        $ops = read_store('ops');
        $ops['nudgeLast'] = ['at' => gmdate('c'), 'sent' => count($sent), 'optedOut' => $skipped];
        write_store('ops', $ops);
    }
    return ['dry' => $dry, 'sent' => count($sent), 'optedOut' => $skipped, 'nudges' => $sent];
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';

// Cron path: the key alone authorizes a run. &dry=1 composes without mailing.
$key = trim($_GET['key'] ?? '');
if ($key !== '') {
    if (!hash_equals(nudge_key(), $key)) respond(401, ['error' => 'Bad key.']);
    respond(200, ['ok' => true] + run_nudges(isset($_GET['dry'])));
}

$auth = require_auth();

// A teacher writing to one student by hand. Nothing automatic about it:
// no priority ladder, no cooldown table, just a person saying a thing to
// another person, with the school's name on the envelope. Educators and
// up. The opt-out is still absolute.
if ($method === 'POST') {
    $in = body_json();
    if (($in['action'] ?? '') === 'personal') {
        require_rank($auth, ROLE_RANK['educator']);
        $email = strtolower(trim($in['email'] ?? ''));
        $message = trim((string)($in['message'] ?? ''));
        $users = read_users();
        $user = $users[$email] ?? null;
        if ($user === null) respond(404, ['error' => 'No such account.']);
        if (mb_strlen($message) < 5 || mb_strlen($message) > 1500) {
            respond(400, ['error' => 'Keep it between 5 and 1500 characters.']);
        }
        if (!empty($user['nudgesOff'])) {
            respond(409, ['error' => 'They have school email switched off. Their call, and it stands.']);
        }
        $first = trim($user['first'] ?? '') ?: strtok($user['name'] ?? 'there', ' ');
        $teacher = $auth['user']['name'] ?? 'Self Made School';
        $subject = (string)($in['subject'] ?? '');
        $subject = trim($subject) === '' ? "A note from $teacher" : mb_substr(trim($subject), 0, 120);
        $body = "$first,\n\n$message\n\n-- $teacher\nSelf Made School\n\n"
            . "Reply to this email and it reaches a person, not a robot.\n"
            . "Turn school email off any time: https://selfmadeschool.org/learn/profile\n";
        $headers = "From: Self Made School <noreply@selfmadeschool.org>\r\n"
            . "Content-Type: text/plain; charset=utf-8";
        @mail($email, $subject, $body, $headers);

        // Recorded against the automatic nudge log too, so the nightly run
        // knows the school already said something today and stays quiet.
        $log = read_store('nudges');
        $today = school_day();
        $log[$email]['personal'] = $today;
        $log[$email]['_any'] = $today;
        write_store('nudges', $log);
        audit_log($auth, 'nudge.personal', mb_substr($message, 0, 80), $email);
        respond(200, ['ok' => true]);
    }
}

// Everything else here is the nightly machine, and that belongs to one person.
require_rank($auth, ROLE_RANK['global_admin']);

if ($method === 'GET') {
    $host = $_SERVER['HTTP_HOST'] ?? 'selfmadeschool.org';
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $ops = read_store('ops');
    respond(200, [
        'ok' => true,
        'cronUrl' => "$scheme://$host/api/nudge.php?key=" . nudge_key(),
        'last' => $ops['nudgeLast'] ?? null,
    ]);
}

if ($method === 'POST') {
    $in = body_json();
    respond(200, ['ok' => true] + run_nudges(!empty($in['dry'])));
}

respond(405, ['error' => 'GET or POST only.']);
