<?php
// Ask the school a question.
//
// Two shapes, because they answer different needs. A poll offers options and
// counts them. An open question collects sentences. Both can go to everybody
// or to one homeroom.
//
// Two rules hold here:
//
//   Answers are per person and changeable. Somebody who clicks the wrong
//   option should be able to fix it, and a poll that cannot be corrected
//   collects worse data than one that can.
//
//   An open question's answers are never anonymous to faculty and never
//   attributed to students. Nobody writes honestly into a room where the
//   whole class reads their name, and nobody should be able to file
//   something the school cannot trace back to a person.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

const FORM_TITLE_MAX = 120;
const FORM_BLURB_MAX = 300;
const FORM_OPTION_MAX = 90;
const FORM_OPTIONS_MAX = 6;
const FORM_ANSWER_MAX = 600;

$auth = require_auth();
$isFaculty = auth_rank($auth) >= ROLE_RANK['educator'];
$me = $auth['email'];
$method = $_SERVER['REQUEST_METHOD'] ?? '';

if (!feature_on('forms')) {
    respond(404, ['error' => 'Asking the school is not switched on.']);
}

$all = read_store('forms');

// Which forms this person may see: everybody's, plus their own homeroom's.
function visible_to(array $form, array $auth, bool $isFaculty): bool {
    if ($isFaculty) return true;
    $room = trim((string)($form['homeroom'] ?? ''));
    if ($room === '') return true;
    return ($auth['user']['homeroom'] ?? '') === $room;
}

function form_row(string $id, array $f, string $me, bool $isFaculty, array $users): array {
    $answers = $f['answers'] ?? [];
    $mine = $answers[$me] ?? null;
    $row = [
        'id' => $id,
        'title' => $f['title'] ?? '',
        'blurb' => $f['blurb'] ?? '',
        'kind' => $f['kind'] ?? 'poll',
        'options' => array_values($f['options'] ?? []),
        'homeroom' => $f['homeroom'] ?? '',
        'closed' => !empty($f['closed']),
        'created' => $f['created'] ?? '',
        'answered' => count($answers),
        'you' => $mine === null ? null : ($mine['value'] ?? null),
    ];

    if (($f['kind'] ?? 'poll') === 'poll') {
        // A poll's counts are public: seeing the room is the point of asking.
        $counts = array_fill(0, count($row['options']), 0);
        foreach ($answers as $a) {
            $i = (int)($a['value'] ?? -1);
            if ($i >= 0 && $i < count($counts)) $counts[$i]++;
        }
        $row['counts'] = $counts;
    } elseif ($isFaculty) {
        // Sentences go to faculty only, with a name attached.
        $written = [];
        foreach ($answers as $email => $a) {
            $written[] = [
                'name' => name_of($users, (string)$email),
                'email' => $email,
                'text' => (string)($a['value'] ?? ''),
                'at' => $a['at'] ?? '',
            ];
        }
        usort($written, fn($x, $y) => strcmp((string)$y['at'], (string)$x['at']));
        $row['written'] = $written;
    }
    return $row;
}

if ($method === 'GET') {
    $users = read_users();
    $rows = [];
    foreach ($all as $id => $f) {
        if (!visible_to($f, $auth, $isFaculty)) continue;
        if (!empty($f['closed']) && !$isFaculty && !isset($f['answers'][$me])) continue;
        $rows[] = form_row($id, $f, $me, $isFaculty, $users);
    }
    usort($rows, fn($a, $b) => strcmp((string)$b['created'], (string)$a['created']));
    respond(200, ['ok' => true, 'forms' => $rows]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

$in = body_json();
$action = (string)($in['action'] ?? '');

// ---------- answering ----------

if ($action === 'answer') {
    $id = (string)($in['id'] ?? '');
    if (!isset($all[$id])) respond(404, ['error' => 'No such question.']);
    $f = $all[$id];
    if (!visible_to($f, $auth, $isFaculty)) respond(403, ['error' => 'That question is not for you.']);
    if (!empty($f['closed'])) respond(400, ['error' => 'That question is closed.']);

    if (($f['kind'] ?? 'poll') === 'poll') {
        $value = (int)($in['value'] ?? -1);
        if ($value < 0 || $value >= count($f['options'] ?? [])) {
            respond(400, ['error' => 'Pick one of the options.']);
        }
    } else {
        $value = trim((string)($in['value'] ?? ''));
        if ($value === '' || mb_strlen($value) > FORM_ANSWER_MAX) {
            respond(400, ['error' => 'Keep it between one character and ' . FORM_ANSWER_MAX . '.']);
        }
    }
    // Changeable on purpose: a wrong click should be fixable.
    $all[$id]['answers'][$me] = ['value' => $value, 'at' => gmdate('c')];
    write_store('forms', $all);
    respond(200, ['ok' => true]);
}

// ---------- everything below is faculty work ----------

require_rank($auth, ROLE_RANK['educator']);

if ($action === 'create') {
    $title = trim((string)($in['title'] ?? ''));
    $blurb = trim((string)($in['blurb'] ?? ''));
    $kind = (string)($in['kind'] ?? 'poll');
    $homeroom = trim((string)($in['homeroom'] ?? ''));
    if ($title === '' || mb_strlen($title) > FORM_TITLE_MAX) {
        respond(400, ['error' => 'Give it a question, under ' . FORM_TITLE_MAX . ' characters.']);
    }
    if (mb_strlen($blurb) > FORM_BLURB_MAX) respond(400, ['error' => 'That note is too long.']);
    if ($kind !== 'poll' && $kind !== 'open') respond(400, ['error' => 'Unknown kind.']);
    if ($homeroom !== '' && !isset(read_store('homerooms')[$homeroom])) {
        respond(404, ['error' => 'No such homeroom.']);
    }

    $options = [];
    if ($kind === 'poll') {
        foreach (($in['options'] ?? []) as $o) {
            $t = trim((string)$o);
            if ($t === '') continue;
            if (mb_strlen($t) > FORM_OPTION_MAX) respond(400, ['error' => 'Keep options short.']);
            $options[] = $t;
        }
        if (count($options) < 2) respond(400, ['error' => 'A poll needs at least two options.']);
        if (count($options) > FORM_OPTIONS_MAX) {
            respond(400, ['error' => 'A poll tops out at ' . FORM_OPTIONS_MAX . ' options.']);
        }
    }

    $id = bin2hex(random_bytes(8));
    $all[$id] = [
        'title' => $title,
        'blurb' => $blurb,
        'kind' => $kind,
        'options' => $options,
        'homeroom' => $homeroom,
        'closed' => false,
        'created' => gmdate('c'),
        'by' => $me,
        'answers' => [],
    ];
    write_store('forms', $all);
    audit_log($auth, 'forms.create', $title);

    // Nobody answers a question they never saw.
    $line = 'The school is asking: ' . mb_substr($title, 0, 120);
    if ($homeroom === '') {
        notify_all('form', $line, '/learn/', $me);
    } else {
        foreach (read_users() as $email => $u) {
            if ($email === $me) continue;
            if (($u['homeroom'] ?? '') === $homeroom) notify($email, 'form', $line, '/learn/');
        }
    }
    respond(200, ['ok' => true, 'id' => $id]);
}

$id = (string)($in['id'] ?? '');
if (!isset($all[$id])) respond(404, ['error' => 'No such question.']);

if ($action === 'close' || $action === 'reopen') {
    $all[$id]['closed'] = $action === 'close';
    write_store('forms', $all);
    respond(200, ['ok' => true]);
}

if ($action === 'delete') {
    audit_log($auth, 'forms.delete', (string)($all[$id]['title'] ?? ''));
    unset($all[$id]);
    write_store('forms', $all);
    respond(200, ['ok' => true]);
}

respond(400, ['error' => 'Unknown action.']);
