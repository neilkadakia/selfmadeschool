<?php
// The Studio's Copilot: drafts a complete unit (hook, blocks, knowledge
// check, flashcards, Field Work action) from a topic, in the house voice.
// Two engines: with ANTHROPIC_API_KEY set in the server environment it runs
// on Claude (structured outputs guarantee the lesson shape); without a key,
// a built-in template produces a clearly-labeled skeleton so the Studio
// works fully offline. Drafts live in the `drafts` store until faculty
// export them as TypeScript for the course files — content still ships
// through the build, the Studio is the writing room.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

const DRAFT_MAX = 100;
const COPILOT_MODEL_DEFAULT = 'claude-opus-5';

$auth = require_auth();
require_rank($auth, ROLE_RANK['educator']);

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$drafts = read_store('drafts');

if ($method === 'GET') {
    $list = [];
    foreach ($drafts as $id => $d) {
        $list[] = ['id' => $id] + $d;
    }
    usort($list, fn($a, $b) => strcmp($b['updated'] ?? '', $a['updated'] ?? ''));
    respond(200, ['ok' => true, 'drafts' => $list, 'copilot' => getenv('ANTHROPIC_API_KEY') !== false]);
}

if ($method !== 'POST') respond(405, ['error' => 'GET or POST only.']);

// ---------- Lesson validation (shared by both engines and manual saves) ----------

function clean_lesson($in): ?array {
    if (!is_array($in)) return null;
    $s = fn($v, int $max = 2000) => is_string($v) && trim($v) !== '' ? mb_substr(trim($v), 0, $max) : null;
    $title = $s($in['title'] ?? null, 80);
    $hook = $s($in['hook'] ?? null, 300);
    $action = $s($in['action'] ?? null, 400);
    if ($title === null || $hook === null || $action === null) return null;

    $blocks = [];
    foreach (($in['blocks'] ?? []) as $b) {
        if (!is_array($b)) return null;
        $kind = $b['kind'] ?? '';
        if ($kind === 'p' || $kind === 'h') {
            $t = $s($b['text'] ?? null);
            if ($t === null) return null;
            $blocks[] = ['kind' => $kind, 'text' => $t];
        } elseif ($kind === 'callout' || $kind === 'example') {
            $t = $s($b['text'] ?? null);
            $ti = $s($b['title'] ?? null, 120);
            if ($t === null || $ti === null) return null;
            $blocks[] = ['kind' => $kind, 'title' => $ti, 'text' => $t];
        } elseif ($kind === 'bigfact') {
            $stat = $s($b['stat'] ?? null, 40);
            $cap = $s($b['caption'] ?? null, 300);
            if ($stat === null || $cap === null) return null;
            $blocks[] = ['kind' => 'bigfact', 'stat' => $stat, 'caption' => $cap];
        } elseif ($kind === 'list') {
            $items = [];
            foreach (($b['items'] ?? []) as $it) {
                $t = $s($it, 300);
                if ($t === null) return null;
                $items[] = $t;
            }
            if (count($items) < 2) return null;
            $row = ['kind' => 'list', 'items' => $items];
            $ti = $s($b['title'] ?? null, 120);
            if ($ti !== null) $row['title'] = $ti;
            $blocks[] = $row;
        } else {
            return null;
        }
    }
    if (count($blocks) < 4 || count($blocks) > 20) return null;

    $quiz = [];
    foreach (($in['quiz'] ?? []) as $q) {
        if (!is_array($q)) return null;
        $question = $s($q['q'] ?? null, 300);
        $explain = $s($q['explain'] ?? null, 400);
        $answer = $q['answer'] ?? null;
        $options = [];
        foreach (($q['options'] ?? []) as $o) {
            $t = $s($o, 160);
            if ($t === null) return null;
            $options[] = $t;
        }
        if ($question === null || $explain === null || count($options) !== 4) return null;
        if (!is_int($answer) || $answer < 0 || $answer > 3) return null;
        $quiz[] = ['q' => $question, 'options' => $options, 'answer' => $answer, 'explain' => $explain];
    }
    if (count($quiz) !== 4) return null;

    $cards = [];
    foreach (($in['cards'] ?? []) as $c) {
        if (!is_array($c)) return null;
        $front = $s($c['front'] ?? null, 160);
        $back = $s($c['back'] ?? null, 300);
        if ($front === null || $back === null) return null;
        $cards[] = ['front' => $front, 'back' => $back];
    }
    if (count($cards) !== 6) return null;

    return [
        'title' => $title,
        'hook' => $hook,
        'blocks' => $blocks,
        'quiz' => $quiz,
        'cards' => $cards,
        'action' => $action,
    ];
}

// ---------- Engine 1: the template (no API key — a labeled skeleton) ----------

function template_lesson(string $topic, string $notes): array {
    $t = mb_substr(trim($topic), 0, 60);
    $todo = fn(string $what) => "[TODO — $what]";
    return [
        'title' => mb_substr(ucwords($t), 0, 80),
        'hook' => $todo("one sentence that makes $t feel personal and urgent, no jargon"),
        'blocks' => [
            ['kind' => 'p', 'text' => $todo("open with the moment this topic actually shows up in someone's life")],
            ['kind' => 'h', 'text' => $todo('the core idea, said plainly')],
            ['kind' => 'p', 'text' => $todo('explain the core idea in plain English — how it works, why school skipped it')],
            ['kind' => 'callout', 'title' => $todo('the one-line rule'), 'text' => $todo('the takeaway someone should remember a year from now')],
            ['kind' => 'bigfact', 'stat' => $todo('a number'), 'caption' => $todo('why that number matters here')],
            ['kind' => 'list', 'title' => $todo('the practical steps'), 'items' => [$todo('step one'), $todo('step two'), $todo('step three')]],
            ['kind' => 'example', 'title' => $todo('a named, concrete example'), 'text' => $todo('walk one realistic person through it with real numbers')],
            ['kind' => 'p', 'text' => $todo('close by connecting it back to becoming self made')],
        ],
        'quiz' => array_map(fn($i) => [
            'q' => $todo("question $i — test the idea, not trivia"),
            'options' => [$todo('right answer'), $todo('plausible wrong'), $todo('plausible wrong'), $todo('plausible wrong')],
            'answer' => 0,
            'explain' => $todo('one sentence on why, teaching even in the explanation'),
        ], [1, 2, 3, 4]),
        'cards' => array_map(fn($i) => [
            'front' => $todo("card $i front — a term or question"),
            'back' => $todo('the version that sticks after the tab closes'),
        ], [1, 2, 3, 4, 5, 6]),
        'action' => $todo("one real-world action for $t someone can do this week — specific, small, start tonight"),
    ];
}

// ---------- Engine 2: Claude (Messages API, structured outputs) ----------

function lesson_schema(): array {
    $obj = fn(array $props, array $req) => [
        'type' => 'object', 'properties' => $props, 'required' => $req, 'additionalProperties' => false,
    ];
    $str = ['type' => 'string'];
    return [
        'type' => 'json_schema',
        'schema' => $obj([
            'title' => $str,
            'hook' => $str,
            'blocks' => ['type' => 'array', 'items' => ['anyOf' => [
                $obj(['kind' => ['const' => 'p'], 'text' => $str], ['kind', 'text']),
                $obj(['kind' => ['const' => 'h'], 'text' => $str], ['kind', 'text']),
                $obj(['kind' => ['const' => 'callout'], 'title' => $str, 'text' => $str], ['kind', 'title', 'text']),
                $obj(['kind' => ['const' => 'bigfact'], 'stat' => $str, 'caption' => $str], ['kind', 'stat', 'caption']),
                $obj(['kind' => ['const' => 'list'], 'title' => $str, 'items' => ['type' => 'array', 'items' => $str]], ['kind', 'items']),
                $obj(['kind' => ['const' => 'example'], 'title' => $str, 'text' => $str], ['kind', 'title', 'text']),
            ]]],
            'quiz' => ['type' => 'array', 'items' => $obj([
                'q' => $str,
                'options' => ['type' => 'array', 'items' => $str],
                'answer' => ['type' => 'integer'],
                'explain' => $str,
            ], ['q', 'options', 'answer', 'explain'])],
            'cards' => ['type' => 'array', 'items' => $obj(['front' => $str, 'back' => $str], ['front', 'back'])],
            'action' => $str,
        ], ['title', 'hook', 'blocks', 'quiz', 'cards', 'action']),
    ];
}

function copilot_system(): string {
    return <<<'PROMPT'
You write course units for Self Made School — an online school for adults 18-30
covering the life skills school never taught: mindset, money, and life's big calls.
Courses: The 13th Grade (intro), The 14th Grade (money), The 15th Grade (big calls).

The house voice: plain English, direct, warm, a little irreverent, never corporate
and never preachy. Second person. Short sentences land harder than long ones.
Deliberately non-academic — no grades, no jargon; when a technical term is
unavoidable, define it in the same breath. Concrete numbers and named, realistic
examples beat abstractions. The reader should finish feeling capable, not lectured.
Never call students "kids" — they are adults. Say "unit" (never "module") and
"video" (never "content"). Never use the word "rep" or "reps".

A unit is one focused idea taught in about ten minutes of reading:
- title: short and concrete, like a chapter name (e.g. "Credit Glow-Up", "Emergency Funds")
- hook: one or two sentences that make the topic feel personal and urgent
- blocks: 6-10 content blocks mixing kinds — p (paragraph), h (section heading),
  callout (a titled rule worth remembering), bigfact (one striking stat + caption),
  list (titled practical steps), example (a named person walked through it with
  real numbers). Open with a p that grounds the topic in real life; use 2-3 h
  headings to structure; include at least one callout, one bigfact, one list,
  and one example; close with a p connecting back to becoming self made.
- quiz: exactly 4 questions testing the idea (never trivia), each with exactly
  4 options, the correct option's zero-based index as answer, and an explain
  line that teaches even when the student got it right.
- cards: exactly 6 flashcards — front is a term or question, back is the version
  that stays with you after the tab closes.
- action: the unit's Field Work — one specific real-world action a student can
  do this week. Small enough to start tonight, real enough to matter.
PROMPT;
}

function copilot_draft(string $course, string $topic, string $notes): array {
    $key = getenv('ANTHROPIC_API_KEY');
    if ($key === false || $key === '') {
        return ['engine' => 'template', 'lesson' => template_lesson($topic, $notes)];
    }
    // Shared hosting caps execution time; a full draft can take a few minutes.
    @set_time_limit(300);

    $user = "Course: {$course}\nUnit topic: {$topic}";
    if ($notes !== '') $user .= "\nFaculty notes to incorporate: {$notes}";
    $user .= "\nWrite the complete unit.";

    $body = [
        'model' => getenv('SMS_COPILOT_MODEL') ?: COPILOT_MODEL_DEFAULT,
        'max_tokens' => 16000,
        // Content drafting in a fixed voice doesn't need maximum reasoning
        // depth, and shared hosting can't sit through it — medium keeps
        // latency inside proxy timeouts. (Thinking itself stays on: the
        // model default. No sampling params — removed on this model line.)
        'output_config' => ['effort' => 'medium', 'format' => lesson_schema()],
        // If a safety classifier declines, retry on Anthropic's recommended
        // fallback model server-side instead of failing the draft.
        'fallbacks' => 'default',
        'system' => copilot_system(),
        'messages' => [['role' => 'user', 'content' => $user]],
    ];

    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER => [
            'x-api-key: ' . $key,
            'anthropic-version: 2023-06-01',
            'anthropic-beta: server-side-fallback-2026-07-01',
            'content-type: application/json',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 280,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($raw === false) respond(502, ['error' => "The Copilot couldn't reach Claude: {$err}"]);
    $res = json_decode($raw, true);
    if ($status !== 200) {
        $msg = $res['error']['message'] ?? "HTTP {$status}";
        respond(502, ['error' => 'The Copilot hit an API error: ' . mb_substr($msg, 0, 200)]);
    }
    // Check the stop reason before touching content — classifiers can decline.
    if (($res['stop_reason'] ?? '') === 'refusal') {
        respond(502, ['error' => 'The Copilot declined this topic. Rephrase it, or draft from the template.']);
    }
    $text = '';
    foreach (($res['content'] ?? []) as $block) {
        if (($block['type'] ?? '') === 'text') $text .= $block['text'];
    }
    $lesson = clean_lesson(json_decode($text, true));
    if ($lesson === null) {
        respond(502, ['error' => 'The Copilot returned an unusable draft — try again.']);
    }
    return ['engine' => 'claude', 'lesson' => $lesson];
}

// ---------- Actions ----------

$in = body_json();
$action = $in['action'] ?? '';

if ($action === 'draft') {
    $course = mb_substr(trim($in['course'] ?? ''), 0, 40);
    $topic = trim($in['topic'] ?? '');
    $notes = mb_substr(trim($in['notes'] ?? ''), 0, 2000);
    if (mb_strlen($topic) < 3 || mb_strlen($topic) > 120) {
        respond(400, ['error' => 'Topic must be 3-120 characters.']);
    }
    if (count($drafts) >= DRAFT_MAX) respond(400, ['error' => 'Draft shelf is full — export or delete some first.']);
    $result = copilot_draft($course !== '' ? $course : 'the-13th-grade', $topic, $notes);
    $id = bin2hex(random_bytes(8));
    $now = gmdate('c');
    $drafts[$id] = [
        'course' => $course,
        'topic' => $topic,
        'engine' => $result['engine'],
        'lesson' => $result['lesson'],
        'createdBy' => $auth['email'],
        'created' => $now,
        'updated' => $now,
    ];
    write_store('drafts', $drafts);
    respond(200, ['ok' => true, 'id' => $id, 'engine' => $result['engine'], 'lesson' => $result['lesson']]);
}

if ($action === 'save') {
    $id = (string)($in['id'] ?? '');
    if (!isset($drafts[$id])) respond(404, ['error' => 'Draft not found.']);
    $lesson = clean_lesson($in['lesson'] ?? null);
    if ($lesson === null) {
        respond(400, ['error' => 'That lesson does not validate — check blocks, exactly 4 quiz questions with 4 options each, and exactly 6 cards.']);
    }
    $drafts[$id]['lesson'] = $lesson;
    $drafts[$id]['updated'] = gmdate('c');
    write_store('drafts', $drafts);
    respond(200, ['ok' => true, 'lesson' => $lesson]);
}

if ($action === 'delete') {
    $id = (string)($in['id'] ?? '');
    if (!isset($drafts[$id])) respond(404, ['error' => 'Draft not found.']);
    unset($drafts[$id]);
    write_store('drafts', $drafts);
    respond(200, ['ok' => true]);
}

respond(400, ['error' => 'Unknown action.']);
