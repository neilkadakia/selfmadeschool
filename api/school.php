<?php
// How the school is configured, and who is allowed in.
//
// One file for the switches that decide what kind of school this is:
// free and open, or paid; self-paced, or running on deadlines; one class,
// or homerooms. Plus the plans themselves and the per-student access that
// falls out of them.
//
// The school ships free and open. Every switch defaults off, so turning
// payment on later is a decision somebody makes on purpose, in one place,
// and it is written to the audit log when they do.
//
//   GET                    what the caller is allowed to open, and on what
//   GET  ?admin=1          the whole configuration, administrators and up
//   POST action=features   flip a switch (Global Administrator)
//   POST action=save_plan  add or edit a plan
//   POST action=drop_plan  retire one
//   POST action=set_plan   put a student on a plan
//   POST action=grant      hand one student one course, plan or no plan
//   POST action=revoke     take that back

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

const PLAN_NAME_MAX = 40;
const PLAN_BLURB_MAX = 200;
const CADENCES = ['once', 'month', 'year'];

$auth = require_auth();
$method = $_SERVER['REQUEST_METHOD'] ?? '';
$settings = read_settings();

// What a plan looks like to somebody who might buy it. Prices are whole
// cents so nothing ever depends on float arithmetic.
function public_plan(array $p): array {
    return [
        'id' => $p['id'] ?? '',
        'name' => $p['name'] ?? '',
        'blurb' => $p['blurb'] ?? '',
        'price' => (int)($p['price'] ?? 0),
        'cadence' => $p['cadence'] ?? 'once',
        'courses' => $p['courses'] ?? [],
        'active' => !empty($p['active']),
    ];
}

if ($method === 'GET') {
    if (isset($_GET['admin'])) {
        require_rank($auth, ROLE_RANK['admin']);
        $grants = read_store('grants');
        $users = read_users();
        // Who is on what, so the front office can see the whole picture
        // without opening twenty Student Files.
        $roll = [];
        foreach ($users as $email => $u) {
            if (role_rank($u['role'] ?? 'student') >= ROLE_RANK['educator']) continue;
            $roll[] = [
                'email' => $email,
                'name' => name_of($users, $email),
                'plan' => $u['plan'] ?? '',
                'grants' => array_keys($grants[$email] ?? []),
                // Always answered as though payment were on. While it is
                // off this is the rehearsal the room promises: exactly who
                // would be locked out. With it on it is simply the truth.
                'access' => access_map($email, $u, true),
            ];
        }
        usort($roll, fn($a, $b) => strcmp($a['name'], $b['name']));
        respond(200, [
            'ok' => true,
            'features' => $settings['features'],
            'plans' => array_map('public_plan', $settings['plans']),
            'defaultPlan' => $settings['defaultPlan'],
            'updated' => $settings['updated'],
            'updatedBy' => $settings['updatedBy'],
            'roll' => $roll,
            'courses' => array_map(
                fn($c) => ['slug' => $c['slug'], 'title' => $c['title'], 'tone' => $c['tone'] ?? 'acc'],
                catalog()['courses']
            ),
        ]);
    }

    // The student's own view: which doors are open, and what would open
    // the rest. Only active plans, and only when payment is actually on.
    $paid = !empty($settings['features']['paid']);
    $access = [];
    foreach (catalog()['courses'] as $c) {
        $a = course_access($auth['email'], $auth['user'], $c['slug']);
        $access[$c['slug']] = [
            'open' => $a['open'],
            'why' => $a['reason'],
            // Only ever an object, and only when the door is shut: the plan
            // that would open it. An open course has nothing to sell.
            'needs' => $a['open'] ? null : ($a['plan'] ?? null),
        ];
    }
    $mine = ($auth['user']['plan'] ?? '') === '' ? null : plan_by_id($settings, $auth['user']['plan']);
    respond(200, [
        'ok' => true,
        'features' => $settings['features'],
        'access' => $access,
        'plan' => $mine === null ? null : public_plan($mine),
        'plans' => $paid
            ? array_values(array_map('public_plan', array_filter($settings['plans'], fn($p) => !empty($p['active']))))
            : [],
    ]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
$action = $in['action'] ?? '';

// ---------- the switches ----------

if ($action === 'features') {
    // What kind of school this is belongs to one person.
    require_rank($auth, ROLE_RANK['global_admin']);
    $given = $in['features'] ?? [];
    if (!is_array($given)) respond(400, ['error' => 'features object required.']);
    $changed = [];
    foreach (default_settings()['features'] as $k => $_) {
        if (!array_key_exists($k, $given)) continue;
        $next = (bool)$given[$k];
        if ($next !== (bool)$settings['features'][$k]) $changed[] = $k . '=' . ($next ? 'on' : 'off');
        $settings['features'][$k] = $next;
    }
    // Turning payment on with no active plan would lock every student out
    // of everything, including the courses they were already reading.
    if (!empty($settings['features']['paid'])) {
        $live = array_filter($settings['plans'], fn($p) => !empty($p['active']));
        if (count($live) === 0) {
            respond(400, ['error' => 'Turn on a plan first, or every student loses access the moment you save.']);
        }
    }
    write_settings($settings, $auth['email']);
    if ($changed) audit_log($auth, 'school.features', implode(', ', $changed));
    respond(200, ['ok' => true, 'features' => $settings['features']]);
}

// ---------- plans ----------

if ($action === 'save_plan') {
    require_rank($auth, ROLE_RANK['admin']);
    $d = $in['plan'] ?? [];
    if (!is_array($d)) respond(400, ['error' => 'plan object required.']);
    $name = trim((string)($d['name'] ?? ''));
    if ($name === '' || mb_strlen($name) > PLAN_NAME_MAX) {
        respond(400, ['error' => 'A plan needs a name, 1 to ' . PLAN_NAME_MAX . ' characters.']);
    }
    $blurb = trim((string)($d['blurb'] ?? ''));
    if (mb_strlen($blurb) > PLAN_BLURB_MAX) respond(400, ['error' => 'Keep the blurb under ' . PLAN_BLURB_MAX . ' characters.']);
    $price = (int)($d['price'] ?? 0);
    if ($price < 0 || $price > 100000000) respond(400, ['error' => 'That price does not look right.']);
    $cadence = (string)($d['cadence'] ?? 'once');
    if (!in_array($cadence, CADENCES, true)) $cadence = 'once';

    // Course list: '*' for everything, otherwise real slugs only.
    $courses = $d['courses'] ?? [];
    if (!is_array($courses)) $courses = [];
    $clean = [];
    foreach ($courses as $slug) {
        if ($slug === '*') { $clean = ['*']; break; }
        if (catalog_course((string)$slug) !== null) $clean[] = (string)$slug;
    }
    if (count($clean) === 0) respond(400, ['error' => 'A plan has to include at least one course.']);

    $id = trim((string)($d['id'] ?? ''));
    $found = false;
    foreach ($settings['plans'] as $i => $p) {
        if (($p['id'] ?? '') !== $id || $id === '') continue;
        $settings['plans'][$i] = [
            'id' => $id, 'name' => $name, 'blurb' => $blurb, 'price' => $price,
            'cadence' => $cadence, 'courses' => array_values(array_unique($clean)),
            'active' => !empty($d['active']),
        ];
        $found = true;
        break;
    }
    if (!$found) {
        $id = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $name));
        $id = trim($id, '-') ?: 'plan';
        $n = 1;
        $base = $id;
        while (plan_by_id($settings, $id) !== null) $id = $base . '-' . (++$n);
        $settings['plans'][] = [
            'id' => $id, 'name' => $name, 'blurb' => $blurb, 'price' => $price,
            'cadence' => $cadence, 'courses' => array_values(array_unique($clean)),
            'active' => !empty($d['active']),
        ];
    }
    write_settings($settings, $auth['email']);
    audit_log($auth, $found ? 'plan.edit' : 'plan.create', $name . ' ($' . number_format($price / 100, 2) . ')');
    respond(200, ['ok' => true, 'plans' => array_map('public_plan', $settings['plans'])]);
}

if ($action === 'drop_plan') {
    require_rank($auth, ROLE_RANK['admin']);
    $id = (string)($in['id'] ?? '');
    $users = read_users();
    foreach ($users as $u) {
        if (($u['plan'] ?? '') === $id) {
            respond(409, ['error' => 'Somebody is on that plan. Move them first.']);
        }
    }
    $before = count($settings['plans']);
    $settings['plans'] = array_values(array_filter($settings['plans'], fn($p) => ($p['id'] ?? '') !== $id));
    if (count($settings['plans']) === $before) respond(404, ['error' => 'No such plan.']);
    if (count($settings['plans']) === 0) respond(400, ['error' => 'The school needs at least one plan.']);
    if (($settings['defaultPlan'] ?? '') === $id) $settings['defaultPlan'] = $settings['plans'][0]['id'];
    write_settings($settings, $auth['email']);
    audit_log($auth, 'plan.drop', $id);
    respond(200, ['ok' => true, 'plans' => array_map('public_plan', $settings['plans'])]);
}

// ---------- who is on what ----------

if ($action === 'set_plan') {
    require_rank($auth, ROLE_RANK['admin']);
    $email = strtolower(trim($in['email'] ?? ''));
    $planId = trim((string)($in['plan'] ?? ''));
    $users = read_users();
    if (!isset($users[$email])) respond(404, ['error' => 'No such account.']);
    if ($planId !== '' && plan_by_id($settings, $planId) === null) respond(404, ['error' => 'No such plan.']);
    $users[$email]['plan'] = $planId;
    write_store('users', $users);
    audit_log($auth, 'plan.assign', $planId === '' ? 'no plan' : $planId, $email);
    respond(200, ['ok' => true, 'access' => access_map($email, $users[$email])]);
}

if ($action === 'grant' || $action === 'revoke') {
    require_rank($auth, ROLE_RANK['admin']);
    $email = strtolower(trim($in['email'] ?? ''));
    $course = trim((string)($in['course'] ?? ''));
    $users = read_users();
    if (!isset($users[$email])) respond(404, ['error' => 'No such account.']);
    if (catalog_course($course) === null) respond(400, ['error' => 'Unknown course.']);
    $grants = read_store('grants');
    if ($action === 'grant') {
        $until = trim((string)($in['until'] ?? ''));
        if ($until !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $until)) {
            respond(400, ['error' => 'That end date does not look right.']);
        }
        $grants[$email][$course] = [
            'by' => $auth['email'],
            'at' => gmdate('c'),
            'until' => $until === '' ? '' : $until . 'T23:59:59+00:00',
            'note' => mb_substr(trim((string)($in['note'] ?? '')), 0, 200),
        ];
    } else {
        unset($grants[$email][$course]);
        if (empty($grants[$email])) unset($grants[$email]);
    }
    write_store('grants', $grants);
    audit_log($auth, 'access.' . $action, $course, $email);
    respond(200, ['ok' => true, 'access' => access_map($email, $users[$email])]);
}

respond(400, ['error' => 'Unknown action.']);
