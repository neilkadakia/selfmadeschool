<?php
// Self Made School LMS API — shared helpers.
// Flat-file JSON storage, kept outside the web root so git deploys never touch it.

declare(strict_types=1);

const TOKEN_TTL = 60 * 60 * 24 * 30; // 30 days
const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60;

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

function body_json(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);
    return is_array($data) ? $data : [];
}

function bearer_token(): string {
    return trim($_SERVER['HTTP_X_AUTH_TOKEN'] ?? '');
}

// Returns ['email' => ..., 'user' => [...]] or responds 401.
function require_auth(): array {
    $token = bearer_token();
    if ($token === '') respond(401, ['error' => 'Not signed in.']);
    $tokens = read_store('tokens');
    $entry = $tokens[$token] ?? null;
    if (!$entry || ($entry['exp'] ?? 0) < time()) {
        respond(401, ['error' => 'Session expired — sign in again.']);
    }
    $users = read_store('users');
    $user = $users[$entry['email']] ?? null;
    if (!$user) respond(401, ['error' => 'Account not found.']);
    return ['email' => $entry['email'], 'user' => $user];
}

function issue_token(string $email): string {
    $token = bin2hex(random_bytes(32));
    $tokens = read_store('tokens');
    $now = time();
    // Prune expired tokens while we're here.
    foreach ($tokens as $t => $e) {
        if (($e['exp'] ?? 0) < $now) unset($tokens[$t]);
    }
    $tokens[$token] = ['email' => $email, 'exp' => $now + TOKEN_TTL];
    write_store('tokens', $tokens);
    return $token;
}

// Loose phone check: common punctuation allowed, 7–15 digits underneath.
// Returns the trimmed value, '' when blank, or null when it can't be a phone.
function clean_phone(string $raw): ?string {
    $phone = trim(preg_replace('/\s+/', ' ', $raw));
    if ($phone === '') return '';
    if (mb_strlen($phone) > 24) return null;
    if (!preg_match('/^\+?[0-9 ().\-]+$/', $phone)) return null;
    $digits = preg_replace('/\D/', '', $phone);
    $n = strlen($digits);
    return ($n >= 7 && $n <= 15) ? $phone : null;
}

function public_user(string $email, array $user): array {
    return [
        'email' => $email,
        'name' => $user['name'] ?? '',
        'first' => $user['first'] ?? '',
        'last' => $user['last'] ?? '',
        'phone' => $user['phone'] ?? '',
        'role' => $user['role'] ?? 'student',
    ];
}
