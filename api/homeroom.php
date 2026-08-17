<?php
// Homerooms: named groups of students.
//
// A small school doesn't need departments and an org chart. It needs to be
// able to say "the March cohort" or "the ones doing this with the book club"
// and then talk to exactly those people: a bulletin only they see, an
// assignment that goes out to all of them at once, a Gradebook filtered
// down to the group you actually teach.
//
// Off by default (features.homerooms). Everything below still works when
// the feature is off so turning it on is a switch, not a migration.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

const NAME_MAX = 40;
const BLURB_MAX = 160;
const TONES = ['acc', 'vio', 'coral', 'lime', 'pink'];

$auth = require_auth();
require_rank($auth, ROLE_RANK['educator']);
$method = $_SERVER['REQUEST_METHOD'] ?? '';
$rooms = read_store('homerooms');
$users = read_users();

function room_out(string $id, array $r, array $users): array {
    $members = [];
    foreach (($r['members'] ?? []) as $e) {
        if (!isset($users[$e])) continue;   // account since deleted
        $members[] = ['email' => $e, 'name' => name_of($users, $e)];
    }
    usort($members, fn($a, $b) => strcmp($a['name'], $b['name']));
    return [
        'id' => $id,
        'name' => $r['name'] ?? '',
        'blurb' => $r['blurb'] ?? '',
        'color' => $r['color'] ?? 'acc',
        'members' => $members,
        'count' => count($members),
        'created' => $r['created'] ?? '',
        'by' => $r['by'] ?? '',
        'byName' => name_of($users, (string)($r['by'] ?? '')),
    ];
}

if ($method === 'GET') {
    $list = [];
    foreach ($rooms as $id => $r) $list[] = room_out($id, $r, $users);
    usort($list, fn($a, $b) => strcmp($a['name'], $b['name']));
    // Anyone not in a homeroom yet, so the front office can see the gap.
    $placed = [];
    foreach ($rooms as $r) foreach (($r['members'] ?? []) as $e) $placed[$e] = true;
    $unplaced = [];
    foreach ($users as $email => $u) {
        if (role_rank($u['role'] ?? 'student') >= ROLE_RANK['educator']) continue;
        if (isset($placed[$email])) continue;
        $unplaced[] = ['email' => $email, 'name' => name_of($users, $email)];
    }
    usort($unplaced, fn($a, $b) => strcmp($a['name'], $b['name']));
    respond(200, [
        'ok' => true,
        'homerooms' => $list,
        'unplaced' => $unplaced,
        'enabled' => !empty(read_settings()['features']['homerooms']),
    ]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
$action = $in['action'] ?? '';

if ($action === 'create') {
    $name = trim((string)($in['name'] ?? ''));
    if ($name === '' || mb_strlen($name) > NAME_MAX) {
        respond(400, ['error' => 'A homeroom needs a name, 1 to ' . NAME_MAX . ' characters.']);
    }
    foreach ($rooms as $r) {
        if (strcasecmp(trim($r['name'] ?? ''), $name) === 0) {
            respond(409, ['error' => 'There is already a homeroom called that.']);
        }
    }
    $blurb = trim((string)($in['blurb'] ?? ''));
    if (mb_strlen($blurb) > BLURB_MAX) respond(400, ['error' => 'Keep the blurb under ' . BLURB_MAX . ' characters.']);
    $color = (string)($in['color'] ?? 'acc');
    if (!in_array($color, TONES, true)) $color = 'acc';
    $id = bin2hex(random_bytes(6));
    $rooms[$id] = [
        'name' => $name,
        'blurb' => $blurb,
        'color' => $color,
        'members' => [],
        'created' => gmdate('c'),
        'by' => $auth['email'],
    ];
    write_store('homerooms', $rooms);
    audit_log($auth, 'homeroom.create', $name);
    respond(200, ['ok' => true, 'homeroom' => room_out($id, $rooms[$id], $users)]);
}

$id = (string)($in['id'] ?? '');
if (!isset($rooms[$id])) respond(404, ['error' => 'No such homeroom.']);

if ($action === 'rename') {
    $name = trim((string)($in['name'] ?? ''));
    if ($name === '' || mb_strlen($name) > NAME_MAX) respond(400, ['error' => 'A homeroom needs a name.']);
    $rooms[$id]['name'] = $name;
    if (isset($in['blurb'])) {
        $blurb = trim((string)$in['blurb']);
        if (mb_strlen($blurb) > BLURB_MAX) respond(400, ['error' => 'Keep the blurb under ' . BLURB_MAX . ' characters.']);
        $rooms[$id]['blurb'] = $blurb;
    }
    if (isset($in['color']) && in_array($in['color'], TONES, true)) $rooms[$id]['color'] = $in['color'];
    write_store('homerooms', $rooms);
    respond(200, ['ok' => true, 'homeroom' => room_out($id, $rooms[$id], $users)]);
}

if ($action === 'add' || $action === 'remove') {
    $email = strtolower(trim($in['email'] ?? ''));
    if (!isset($users[$email])) respond(404, ['error' => 'No such account.']);
    $members = array_values(array_unique($rooms[$id]['members'] ?? []));
    if ($action === 'add') {
        // One homeroom each: adding somewhere pulls them out of anywhere else,
        // so "which room is this student in" always has one answer.
        foreach ($rooms as $rid => $r) {
            $rooms[$rid]['members'] = array_values(array_filter(
                $r['members'] ?? [],
                fn($e) => $e !== $email
            ));
        }
        $members = array_values(array_filter($members, fn($e) => $e !== $email));
        $members[] = $email;
        $users[$email]['homeroom'] = $id;
    } else {
        $members = array_values(array_filter($members, fn($e) => $e !== $email));
        if (($users[$email]['homeroom'] ?? '') === $id) $users[$email]['homeroom'] = '';
    }
    $rooms[$id]['members'] = $members;
    write_store('homerooms', $rooms);
    write_store('users', $users);
    audit_log($auth, 'homeroom.' . $action, $rooms[$id]['name'] ?? '', $email);
    respond(200, ['ok' => true, 'homeroom' => room_out($id, $rooms[$id], $users)]);
}

if ($action === 'delete') {
    require_rank($auth, ROLE_RANK['admin']);
    foreach (($rooms[$id]['members'] ?? []) as $e) {
        if (isset($users[$e]) && ($users[$e]['homeroom'] ?? '') === $id) $users[$e]['homeroom'] = '';
    }
    $name = $rooms[$id]['name'] ?? '';
    unset($rooms[$id]);
    write_store('homerooms', $rooms);
    write_store('users', $users);
    audit_log($auth, 'homeroom.delete', $name);
    respond(200, ['ok' => true]);
}

respond(400, ['error' => 'Unknown action.']);
