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
    ];
}
