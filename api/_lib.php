<?php
// Self Made School LMS API: shared helpers.
// Flat-file JSON storage, kept outside the web root so git deploys never touch it.

declare(strict_types=1);

const TOKEN_TTL = 60 * 60 * 24 * 30; // 30 days
const IMPERSONATE_TTL = 60 * 60 * 2; // Act As sessions die after 2 hours
const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60;

// The role ladder. Rank gates everything: an action requires a minimum
// rank, and Act As only ever reaches strictly below your own.
const ROLE_RANK = [
    'student' => 0,
    'educator' => 1,
    'admin' => 2,
    'global_admin' => 3,
];

function role_rank(?string $role): int {
    return ROLE_RANK[$role ?? ''] ?? 0;
}

function auth_rank(array $auth): int {
    return role_rank($auth['user']['role'] ?? 'student');
}

function require_rank(array $auth, int $min): void {
    if (auth_rank($auth) < $min) respond(403, ['error' => 'Not allowed for your role.']);
}

function data_dir(): string {
    static $dir = null;
    if ($dir !== null) return $dir;
    // Preferred: sibling of public_html (not web-accessible, survives deploys).
    $external = dirname(__DIR__, 2) . '/sms-lms-data';
    if (is_dir($external) || @mkdir($external, 0700, true)) {
        if (is_writable($external)) return $dir = $external;
    }
    // Fallback: inside api/ (shipped .htaccess denies web access to it).
    $local = __DIR__ . '/data';
    if (!is_dir($local)) @mkdir($local, 0700, true);
    return $dir = $local;
}

function storage_mode(): string {
    return str_ends_with(data_dir(), 'sms-lms-data') ? 'external' : 'local';
}

function respond(int $code, array $body): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}

// Answer first, then do the slow thing.
//
// mail() blocks until the mail transport takes the message. That is a few
// milliseconds on a healthy host and several seconds on a sick one, and
// either way the person who clicked the button is sitting there watching
// a spinner for work that has already been saved. This hands the response
// back and runs $after with the connection already closed.
//
// Under PHP-FPM and LiteSpeed that is exact. Anywhere else it degrades to
// what the code did before: flush, then carry on.
function respond_then(int $code, array $body, callable $after): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    $json = json_encode($body, JSON_UNESCAPED_SLASHES);
    header('Content-Length: ' . strlen($json));
    header('Connection: close');
    echo $json;

    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } elseif (function_exists('litespeed_finish_request')) {
        litespeed_finish_request();
    } else {
        while (ob_get_level() > 0) @ob_end_flush();
        @flush();
    }

    // Whatever happens out here, the caller already has its answer. A
    // mail server having a bad day must never look like a failed save.
    ignore_user_abort(true);
    try {
        $after();
    } catch (Throwable $e) {
        // Nothing to report to: the response is gone.
    }
    exit;
}

function cors_and_preflight(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = [
        'https://selfmadeschool.org',
        'https://www.selfmadeschool.org',
        'http://localhost:3000',
    ];
    if (in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Headers: Content-Type, X-Auth-Token');
        header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
        header('Access-Control-Max-Age: 86400');
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function read_store(string $name): array {
    $path = data_dir() . '/' . $name . '.json';
    if (!file_exists($path)) return [];
    $fp = fopen($path, 'r');
    if (!$fp) return [];
    flock($fp, LOCK_SH);
    $raw = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    $data = json_decode($raw ?: '{}', true);
    return is_array($data) ? $data : [];
}

function write_store(string $name, array $data): void {
    $path = data_dir() . '/' . $name . '.json';
    $tmp = $path . '.tmp.' . getmypid();
    file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_SLASHES), LOCK_EX);
    rename($tmp, $path);
}

// Users store, with a one-time migration: if no Global Administrator
// exists yet, the earliest-created legacy admin becomes one. On the
// live school that is the founding account.
function read_users(): array {
    $users = read_store('users');
    foreach ($users as $u) {
        if (($u['role'] ?? '') === 'global_admin') return $users;
    }
    $oldest = null;
    $oldestCreated = null;
    foreach ($users as $email => $u) {
        if (($u['role'] ?? '') !== 'admin') continue;
        $created = $u['created'] ?? '9999';
        if ($oldestCreated === null || strcmp($created, $oldestCreated) < 0) {
            $oldestCreated = $created;
            $oldest = $email;
        }
    }
    if ($oldest !== null) {
        $users[$oldest]['role'] = 'global_admin';
        write_store('users', $users);
    }
    return $users;
}

function body_json(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);
    return is_array($data) ? $data : [];
}

function bearer_token(): string {
    return trim($_SERVER['HTTP_X_AUTH_TOKEN'] ?? '');
}

// Returns ['email' => ..., 'user' => [...], 'actor' => ?string] or responds 401.
// 'actor' is set when this session is an Act As impersonation.
function require_auth(): array {
    $token = bearer_token();
    if ($token === '') respond(401, ['error' => 'Not signed in.']);
    $tokens = read_store('tokens');
    $entry = $tokens[$token] ?? null;
    if (!$entry || ($entry['exp'] ?? 0) < time()) {
        respond(401, ['error' => 'Session expired. Sign in again.']);
    }
    $users = read_users();
    $user = $users[$entry['email']] ?? null;
    if (!$user) respond(401, ['error' => 'Account not found.']);
    return ['email' => $entry['email'], 'user' => $user, 'actor' => $entry['actor'] ?? null];
}

function issue_token(string $email, ?string $actor = null, ?int $ttl = null): string {
    $token = bin2hex(random_bytes(32));
    $tokens = read_store('tokens');
    $now = time();
    // Prune expired tokens while we're here.
    foreach ($tokens as $t => $e) {
        if (($e['exp'] ?? 0) < $now) unset($tokens[$t]);
    }
    $entry = ['email' => $email, 'exp' => $now + ($ttl ?? TOKEN_TTL)];
    if ($actor !== null) $entry['actor'] = $actor;
    $tokens[$token] = $entry;
    write_store('tokens', $tokens);
    return $token;
}

// Loose phone check: common punctuation allowed, 7–15 digits underneath.
// US numbers (10 digits, or 11 with a leading 1) are canonicalized to
// the house format: +1 (949) 201-9160. Others are stored as typed.
// Returns the value, '' when blank, or null when it can't be a phone.
function clean_phone(string $raw): ?string {
    $phone = trim(preg_replace('/\s+/', ' ', $raw));
    if ($phone === '') return '';
    if (mb_strlen($phone) > 24) return null;
    if (!preg_match('/^\+?[0-9 ().\-]+$/', $phone)) return null;
    $digits = preg_replace('/\D/', '', $phone);
    $n = strlen($digits);
    if ($n < 7 || $n > 15) return null;
    $isUs = ($n === 10 && $phone[0] !== '+') || ($n === 11 && $digits[0] === '1');
    if ($isUs) {
        $d = substr($digits, -10);
        return '+1 (' . substr($d, 0, 3) . ') ' . substr($d, 3, 3) . '-' . substr($d, 6);
    }
    return $phone;
}

// Birthday check: YYYY-MM-DD (what <input type=date> sends), a real
// calendar date, not in the future, not implausibly old.
// Returns the value, '' when blank, or null when it can't be a birthday.
function clean_dob(string $raw): ?string {
    $dob = trim($raw);
    if ($dob === '') return '';
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $dob, $m)) return null;
    if ((int)$m[1] < 1900) return null;
    if (!checkdate((int)$m[2], (int)$m[3], (int)$m[1])) return null;
    if ($dob > gmdate('Y-m-d')) return null;
    return $dob;
}

function public_user(string $email, array $user): array {
    return [
        'email' => $email,
        'name' => $user['name'] ?? '',
        'first' => $user['first'] ?? '',
        'last' => $user['last'] ?? '',
        'phone' => $user['phone'] ?? '',
        'dob' => $user['dob'] ?? '',
        'role' => $user['role'] ?? 'student',
        'nudges' => empty($user['nudgesOff']),
        'listed' => empty($user['unlisted']),
        'plan' => $user['plan'] ?? '',
        'homeroom' => $user['homeroom'] ?? '',
    ];
}

// A student's display name, falling back to the part of the email before
// the @ so a half-finished account never shows up as a blank row.
function name_of(array $users, string $email): string {
    $n = trim($users[$email]['name'] ?? '');
    if ($n !== '') return $n;
    return strtok($email, '@') ?: $email;
}

// ---------- The catalog ----------
//
// api/catalog.json is written at build time from lib/lms.ts (see
// scripts/export-final-keys.ts). It is the server's only knowledge of what
// the courses and units are called. Nothing here hard-codes a slug.

function catalog(): array {
    static $cat = null;
    if ($cat !== null) return $cat;
    $raw = @file_get_contents(__DIR__ . '/catalog.json');
    $data = json_decode($raw ?: '', true);
    return $cat = is_array($data) && isset($data['courses']) ? $data : ['courses' => []];
}

function catalog_course(string $slug): ?array {
    foreach (catalog()['courses'] as $c) {
        if (($c['slug'] ?? '') === $slug) return $c;
    }
    return null;
}

function catalog_unit(string $courseSlug, string $unitSlug): ?array {
    $course = catalog_course($courseSlug);
    foreach ($course['units'] ?? [] as $u) {
        if (($u['slug'] ?? '') === $unitSlug) return $u;
    }
    return null;
}

// Course slug => title, for emails and tables.
function course_titles(): array {
    $map = [];
    foreach (catalog()['courses'] as $c) $map[$c['slug']] = $c['title'] ?? $c['slug'];
    return $map;
}

// Only units that have a written lesson count toward "done": a unit on the
// syllabus but not yet taught can never be completed, so counting it would
// make every student look behind.
function taught_units(string $courseSlug): array {
    $course = catalog_course($courseSlug);
    $out = [];
    foreach ($course['units'] ?? [] as $u) {
        if (!empty($u['taught'])) $out[] = $u['slug'];
    }
    return $out;
}

// ---------- One student's synced state ----------

function progress_of(string $email): array {
    return read_store('progress_' . sha1($email));
}

function state_of(string $email): array {
    $saved = progress_of($email);
    $state = $saved['state'] ?? [];
    return is_array($state) ? $state : [];
}

// ---------- School settings ----------
//
// Everything the school can turn on or off lives here, so the product can
// run as a free, open, self-paced school today and as a paid, cohorted,
// deadline-driven one later without a second codebase. Defaults are the
// school as it is now: open, free, no deadlines.

function default_settings(): array {
    return [
        'features' => [
            // Assignments may carry a due date, and the Gradebook flags
            // anything past it. Off: assignments are invitations, no clock.
            'deadlines' => false,
            // Course access is gated by a plan. Off: everything is open to
            // every signed-in student, which is how the school opened.
            'paid' => false,
            // Homerooms: named groups of students, for targeted bulletins
            // and roster filtering.
            'homerooms' => false,
            // Faculty read and reply to Field Work filings.
            'fieldwork' => true,
            // Students see who is on the Honor Roll. Already shipped; the
            // flag lets a future cohort run quietly.
            'honorRoll' => true,
        ],
        // Plans exist even when 'paid' is off, so turning it on is a switch
        // and not a migration. The open plan covers everything for free.
        'plans' => [
            [
                'id' => 'open',
                'name' => 'Open Enrollment',
                'blurb' => 'Every course, free, while the school is in closed session.',
                'price' => 0,
                'cadence' => 'once',
                'courses' => ['*'],
                'active' => true,
            ],
        ],
        'defaultPlan' => 'open',
        'updated' => '',
        'updatedBy' => '',
    ];
}

function read_settings(): array {
    $saved = read_store('settings');
    $d = default_settings();
    $out = $d;
    if (isset($saved['features']) && is_array($saved['features'])) {
        $out['features'] = array_merge($d['features'], array_map(
            fn($v) => (bool)$v,
            array_intersect_key($saved['features'], $d['features'])
        ));
    }
    if (isset($saved['plans']) && is_array($saved['plans']) && count($saved['plans']) > 0) {
        $out['plans'] = array_values($saved['plans']);
    }
    foreach (['defaultPlan', 'updated', 'updatedBy'] as $k) {
        if (isset($saved[$k])) $out[$k] = $saved[$k];
    }
    return $out;
}

function write_settings(array $settings, string $by): void {
    $settings['updated'] = gmdate('c');
    $settings['updatedBy'] = $by;
    write_store('settings', $settings);
}

function feature_on(string $name): bool {
    $s = read_settings();
    return !empty($s['features'][$name]);
}

function plan_by_id(array $settings, string $id): ?array {
    foreach ($settings['plans'] as $p) {
        if (($p['id'] ?? '') === $id) return $p;
    }
    return null;
}

function plan_covers(array $plan, string $courseSlug): bool {
    $courses = $plan['courses'] ?? [];
    return in_array('*', $courses, true) || in_array($courseSlug, $courses, true);
}

// ---------- The access gate ----------
//
// One function decides whether a person may open a course. Every surface
// that reveals course content goes through it, so turning payment on can
// never leave a back door open.
//
// Returns ['open' => true] or ['open' => false, 'reason' => ..., 'plan' => ...].

// $asIfPaid lets the front office see what the school would look like the
// moment payment is switched on, without switching it on. Nothing but the
// Enrollment preview passes it.
function course_access(string $email, array $user, string $courseSlug, bool $asIfPaid = false): array {
    $settings = read_settings();
    if (empty($settings['features']['paid']) && !$asIfPaid) return ['open' => true, 'reason' => 'free'];
    // Faculty read everything: they have to be able to see what they teach.
    if (role_rank($user['role'] ?? 'student') >= ROLE_RANK['educator']) {
        return ['open' => true, 'reason' => 'faculty'];
    }
    // A one-off grant from the front office beats any plan.
    $grants = read_store('grants');
    $g = $grants[$email][$courseSlug] ?? null;
    if ($g !== null) {
        $until = $g['until'] ?? '';
        if ($until === '' || $until > gmdate('c')) return ['open' => true, 'reason' => 'granted'];
    }
    $planId = $user['plan'] ?? ($settings['defaultPlan'] ?? '');
    $plan = $planId === '' ? null : plan_by_id($settings, $planId);
    if ($plan !== null && !empty($plan['active']) && plan_covers($plan, $courseSlug)) {
        return ['open' => true, 'reason' => 'plan', 'plan' => $plan['id']];
    }
    // Locked. Name the cheapest active plan that would open it, so the
    // student is told the way in rather than just the wall.
    $best = null;
    foreach ($settings['plans'] as $p) {
        if (empty($p['active']) || !plan_covers($p, $courseSlug)) continue;
        if ($best === null || (int)($p['price'] ?? 0) < (int)($best['price'] ?? 0)) $best = $p;
    }
    return [
        'open' => false,
        'reason' => 'locked',
        'plan' => $best === null ? null : [
            'id' => $best['id'],
            'name' => $best['name'] ?? '',
            'blurb' => $best['blurb'] ?? '',
            'price' => (int)($best['price'] ?? 0),
            'cadence' => $best['cadence'] ?? 'once',
        ],
    ];
}

// Which courses this person may open, as slug => bool.
function access_map(string $email, array $user, bool $asIfPaid = false): array {
    $map = [];
    foreach (catalog()['courses'] as $c) {
        $map[$c['slug']] = course_access($email, $user, $c['slug'], $asIfPaid)['open'];
    }
    return $map;
}

// ---------- Telling somebody something happened ----------
//
// The school writes a great deal at students: a reply on their post, kudos,
// an endorsed answer, a bulletin, a challenge they finished. None of it is
// worth anything if they never find out. One store, keyed by email, newest
// first, capped so it stays a file you can open.
//
// This is not mail. It is the bell in the classroom, and it never leaves the
// building, so it costs nothing and can be written on any path.

const NOTIFY_MAX = 60;

function notify(string $email, string $kind, string $text, string $href = ''): void {
    if ($email === '') return;
    $all = read_store('notify');
    $mine = $all[$email] ?? [];
    array_unshift($mine, [
        'id' => bin2hex(random_bytes(6)),
        'kind' => $kind,
        'text' => mb_substr($text, 0, 240),
        'href' => $href,
        'at' => gmdate('c'),
        'read' => false,
    ]);
    $all[$email] = array_slice($mine, 0, NOTIFY_MAX);
    write_store('notify', $all);
}

// The same line to a room full of people, written once. Skips the person who
// caused it: nobody needs telling about their own announcement.
function notify_all(string $kind, string $text, string $href = '', string $except = ''): void {
    $users = read_users();
    $all = read_store('notify');
    $now = gmdate('c');
    foreach ($users as $email => $u) {
        if ($email === $except) continue;
        $mine = $all[$email] ?? [];
        array_unshift($mine, [
            'id' => bin2hex(random_bytes(6)),
            'kind' => $kind,
            'text' => mb_substr($text, 0, 240),
            'href' => $href,
            'at' => $now,
            'read' => false,
        ]);
        $all[$email] = array_slice($mine, 0, NOTIFY_MAX);
    }
    write_store('notify', $all);
}

// ---------- The audit log ----------
//
// Anything a member of staff does that touches somebody else's account
// lands here: role changes, Act As, account creation, access grants,
// takedowns. Read-only from the app, newest first, capped so the store
// stays a file you can open.

const AUDIT_MAX = 2000;

function audit_log(array $auth, string $action, string $detail = '', string $subject = ''): void {
    $log = read_store('audit');
    $rows = $log['rows'] ?? [];
    array_unshift($rows, [
        'at' => gmdate('c'),
        'actor' => $auth['actor'] ?? $auth['email'],
        // When the entry was written during an Act As session, both the
        // real driver and the account being driven are on the record.
        'as' => $auth['actor'] !== null ? $auth['email'] : '',
        'role' => $auth['user']['role'] ?? '',
        'action' => $action,
        'subject' => $subject,
        'detail' => mb_substr($detail, 0, 300),
    ]);
    write_store('audit', ['rows' => array_slice($rows, 0, AUDIT_MAX)]);
}
