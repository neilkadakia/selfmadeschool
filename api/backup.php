<?php
// Data backups. Admin GET → the secret cron URL (key generated once,
// stored in the data dir). A request with ?key=… (for Hostinger cron)
// or an admin POST runs a backup: every store zipped into a sibling
// sms-lms-backups/ folder, newest 14 kept.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

function backup_key(): string {
    $ops = read_store('ops');
    if (empty($ops['backupKey'])) {
        $ops['backupKey'] = bin2hex(random_bytes(16));
        write_store('ops', $ops);
    }
    return $ops['backupKey'];
}

function run_backup(): array {
    if (!class_exists('ZipArchive')) respond(500, ['error' => 'ZipArchive is missing on this PHP.']);
    $src = data_dir();
    $dest = dirname($src) . '/sms-lms-backups';
    if (!is_dir($dest) && !@mkdir($dest, 0700, true)) {
        respond(500, ['error' => 'Cannot create the backup folder.']);
    }
    $file = $dest . '/backup-' . gmdate('Ymd-His') . '.zip';
    $zip = new ZipArchive();
    if ($zip->open($file, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        respond(500, ['error' => 'Cannot open the zip for writing.']);
    }
    $count = 0;
    foreach (glob($src . '/*.json') as $path) {
        $zip->addFile($path, basename($path));
        $count++;
    }
    $zip->close();
    $all = glob($dest . '/backup-*.zip');
    rsort($all);
    foreach (array_slice($all, 14) as $old) {
        @unlink($old);
    }
    return [
        'file' => basename($file),
        'stores' => $count,
        'bytes' => filesize($file) ?: 0,
        'kept' => min(count($all), 14),
    ];
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';

// Cron path: the key alone authorizes a backup run.
$key = trim($_GET['key'] ?? '');
if ($key !== '') {
    if (!hash_equals(backup_key(), $key)) respond(401, ['error' => 'Bad key.']);
    respond(200, ['ok' => true] + run_backup());
}

$auth = require_auth();
// School ops belong to the Global Administrator alone.
require_rank($auth, ROLE_RANK['global_admin']);

if ($method === 'GET') {
    $host = $_SERVER['HTTP_HOST'] ?? 'selfmadeschool.org';
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    respond(200, ['ok' => true, 'cronUrl' => "$scheme://$host/api/backup.php?key=" . backup_key()]);
}

if ($method === 'POST') {
    respond(200, ['ok' => true] + run_backup());
}

respond(405, ['error' => 'GET or POST only.']);
