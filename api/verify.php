<?php
// Is this certificate real?
//
// The only endpoint in the school that answers without a session, because a
// certificate is worth nothing if the person reading it has to have an
// account to check it. That makes what it says the whole design:
//
//   given a code, it returns the name on the certificate, the course, the
//   date, and whether the final was passed. Nothing else. Not an email, not
//   an XP total, not what else that person is studying.
//
// A code is a one-way derivation from the email and the course, so it cannot
// be walked backwards, and guessing one is guessing 12 hex characters. Codes
// are only ever issued to the student they belong to, from certificate.php.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

// verify_code() lives in _lib.php: finals.php mints the same codes when it
// hands one to the student it belongs to.

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') respond(405, ['error' => 'GET only.']);

// Off unless the school turns it on: an endpoint that answers to the whole
// internet should exist only when somebody has decided it should.
if (!feature_on('certVerify')) {
    respond(404, ['error' => 'Certificate checking is not switched on for this school.']);
}

$code = strtoupper(trim($_GET['code'] ?? ''));
if (!preg_match('/^[A-F0-9]{12}$/', $code)) {
    respond(400, ['ok' => false, 'error' => 'That is not a certificate code.']);
}

$users = read_users();
$finals = read_store('finals');
$titles = course_titles();

foreach ($users as $email => $u) {
    foreach (catalog()['courses'] as $c) {
        $slug = (string)($c['slug'] ?? '');
        if ($slug === '' || verify_code((string)$email, $slug) !== $code) continue;

        $rec = $finals[$email][$slug] ?? null;
        $passed = !empty($rec['passed']);
        // A certificate exists once the course is finished; the final is what
        // makes it "with honors", and the check says which it is.
        if (!$passed && !course_finished((string)$email, $slug)) {
            respond(200, ['ok' => false, 'reason' => 'not-earned']);
        }
        respond(200, [
            'ok' => true,
            'name' => name_of($users, (string)$email),
            'course' => $titles[$slug] ?? $slug,
            'passedFinal' => $passed,
            'score' => $passed ? (int)($rec['score'] ?? 0) : null,
            'total' => $passed ? (int)($rec['total'] ?? 0) : null,
            'date' => $passed ? substr((string)($rec['first'] ?? ''), 0, 10) : '',
        ]);
    }
}

// A code that matches nothing is not an error; it is an answer.
respond(200, ['ok' => false, 'reason' => 'unknown']);
