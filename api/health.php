<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

$users = read_store('users');
respond(200, [
    'ok' => true,
    'php' => PHP_VERSION,
    'storage' => storage_mode(),
    'writable' => is_writable(data_dir()),
    'hasUsers' => count($users) > 0,
]);
