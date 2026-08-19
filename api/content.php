<?php
// The curriculum, handed out one piece at a time, and only to people allowed
// to have it.
//
// This is the endpoint that makes a paid course mean something. The website is
// a static export, so its lesson text sits in the JavaScript bundle whatever
// course_access() says; anyone determined enough can read it. Content served
// from here is different: nothing leaves until the same gate every other
// content path uses has said yes. The phone app reads only from here, so the
// app has never had the weakness the web build has.
//
// Shapes:
//   GET ?                          every course, with its access verdict
//   GET ?course=X                  that course's parts and units, no bodies
//   GET ?course=X&unit=Y           one lesson
//   GET ?course=X&all=1            every lesson in the course, for offline
//
// content.json is written by scripts/export-content.ts on every build and is
// denied to the web by api/.htaccess, so this file is the only way in.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

$auth = require_auth();
$email = $auth['email'];
$user = $auth['user'];

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') respond(405, ['error' => 'GET only.']);

function content(): array {
    static $c = null;
    if ($c !== null) return $c;
    $raw = @file_get_contents(__DIR__ . '/content.json');
    $data = json_decode($raw ?: '', true);
    return $c = is_array($data) && isset($data['courses']) ? $data : ['courses' => []];
}

function content_course(string $slug): ?array {
    foreach (content()['courses'] as $c) {
        if (($c['slug'] ?? '') === $slug) return $c;
    }
    return null;
}

/** A course without its lesson bodies: enough to draw the syllabus. */
function shell(array $c): array {
    unset($c['lessons']);
    return $c;
}

$courseSlug = trim((string)($_GET['course'] ?? ''));
$unitSlug = trim((string)($_GET['unit'] ?? ''));
$wantAll = ($_GET['all'] ?? '') !== '';

// ---------- the whole shelf ----------
// No bodies here, deliberately: this is the "what could I study" question, and
// answering it must not leak a course somebody has not unlocked.
if ($courseSlug === '') {
    $rows = [];
    foreach (content()['courses'] as $c) {
        $access = course_access($email, $user, (string)$c['slug']);
        $row = shell($c);
        $row['access'] = $access;
        // A locked course still shows its cover: title, blurb, how long it is.
        // What it does not show is a single line of the teaching.
        if (!($access['open'] ?? false)) {
            $row['parts'] = array_map(function (array $p): array {
                $p['units'] = array_map(fn(array $u): array => [
                    'slug' => $u['slug'],
                    'title' => $u['title'],
                    'live' => $u['live'] ?? false,
                    'taught' => $u['taught'] ?? false,
                ], $p['units'] ?? []);
                return $p;
            }, $row['parts'] ?? []);
        }
        $rows[] = $row;
    }
    respond(200, ['ok' => true, 'courses' => $rows, 'generated' => content()['generated'] ?? '']);
}

// ---------- one course ----------
$course = content_course($courseSlug);
if ($course === null) respond(404, ['error' => 'No such course.']);

$access = course_access($email, $user, $courseSlug);
if (!($access['open'] ?? false)) {
    // Say why, in the same words the classroom uses, and send no teaching.
    respond(403, ['error' => 'That course is not open to you yet.', 'access' => $access]);
}

if ($unitSlug !== '') {
    $lesson = $course['lessons'][$unitSlug] ?? null;
    if ($lesson === null) respond(404, ['error' => 'That unit has no lesson yet.']);
    respond(200, [
        'ok' => true,
        'course' => $courseSlug,
        'unit' => $unitSlug,
        'lesson' => $lesson,
    ]);
}

if ($wantAll) {
    // Take This Course Offline, for the app. One request, the whole course.
    respond(200, [
        'ok' => true,
        'course' => shell($course),
        'lessons' => $course['lessons'] ?? [],
        'generated' => content()['generated'] ?? '',
    ]);
}

respond(200, [
    'ok' => true,
    'course' => shell($course),
    'access' => $access,
    'generated' => content()['generated'] ?? '',
]);
