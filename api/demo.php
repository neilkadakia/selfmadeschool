<?php
// The Walkthrough: a private guided demo of the school, the product, and
// how it was built. Administrator and up only.
//
// The copy lives here, on the server, on purpose. The site is a static
// export, so anything placed in a React component ships to every browser
// that asks. Keeping the document here means the page ships an empty
// renderer and the words never leave the server without a valid token.

declare(strict_types=1);
require __DIR__ . '/_lib.php';
cors_and_preflight();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, ['error' => 'GET only.']);
}

$auth = require_auth();
require_rank($auth, ROLE_RANK['admin']);

// ---------------------------------------------------------------------
// The document. Chapters render in order; every chapter is deep-linkable
// by id, which is what makes this presentable on a call.
// ---------------------------------------------------------------------

$doc = [
    'title' => 'The Walkthrough',
    'subtitle' => 'What Self Made School is, what already works, and how it got built.',
    'updated' => '08-15-2026',
    'chapters' => [

        // -------------------------------------------------------------
        [
            'id' => 'problem',
            'num' => '01',
            'label' => 'The Problem',
            'kicker' => 'Start Here',
            'title' => 'School stops right before the part you actually live in.',
            'lede' => "Thirteen years of instruction, and nobody sat you down for the part where you run your own life. That is the gap, and it is not a small one.",
            'blocks' => [
                [
                    'type' => 'text',
                    'body' => "The people we teach are 18 to 30. They can find the area of a triangle and name the year of a war. Then a lease shows up, or a 401(k) enrollment form, or a salary number that needs a counteroffer, and the training just stops. Not because it is hard. Because nobody covered it.",
                ],
                [
                    'type' => 'cards',
                    'items' => [
                        ['title' => 'Money', 'body' => "Taxes, credit, insurance, retirement accounts. Machinery everyone is assumed to already understand.", 'tone' => 'acc'],
                        ['title' => 'Judgment', 'body' => "Career moves, where to live, who to keep close. The decisions with the biggest consequences get the least instruction.", 'tone' => 'vio'],
                        ['title' => 'Self-management', 'body' => "Habits, discipline, boundaries, handling a no. The load-bearing skills, taught nowhere.", 'tone' => 'coral'],
                    ],
                ],
                [
                    'type' => 'note',
                    'body' => "The premise is not that school failed. It is that school ended, and something has to come after it.",
                ],
            ],
        ],

        // -------------------------------------------------------------
        [
            'id' => 'concept',
            'num' => '02',
            'label' => 'The Concept',
            'kicker' => 'The Idea',
            'title' => 'Keep counting.',
            'lede' => "You finished 12th grade. The name says exactly what this is and needs no further explanation, which is the whole point.",
            'blocks' => [
                [
                    'type' => 'text',
                    'body' => "Three courses, in order, each one a year that should have existed. The ladder is the product. Someone hears the name once and immediately knows both what it is and that they missed it.",
                ],
                [
                    'type' => 'cards',
                    'items' => [
                        ['title' => 'The 13th Grade', 'body' => "The intro year. Mindset, money basics, and life's big calls. The foundations of running yourself. 24 units.", 'tone' => 'acc'],
                        ['title' => 'The 14th Grade', 'body' => "All money, all year. Handling it, understanding it, and making the right calls with it.", 'tone' => 'vio'],
                        ['title' => 'The 15th Grade', 'body' => "The big decisions: career, place, people. How to actually think them through instead of guessing.", 'tone' => 'coral'],
                    ],
                ],
                [
                    'type' => 'text',
                    'body' => "Deliberately non-academic. No grades that follow you, no degree, no lecture halls, no jargon. Plain English, and skills that get used the same week they are learned.",
                ],
                [
                    'type' => 'list',
                    'title' => 'The method, four steps',
                    'items' => [
                        "Read. Every unit starts as a chapter of the book, on your own time.",
                        "Watch. A short filmed piece per chapter, finishable in under 20 minutes.",
                        "Do. A real challenge with your real numbers: build the budget, file the thing, make the call.",
                        "Flex. Badges, a final, and a certificate at the end of it.",
                    ],
                ],
            ],
        ],

        // -------------------------------------------------------------
        [
            'id' => 'unit',
            'num' => '03',
            'label' => 'A Unit',
            'kicker' => 'The Atom',
            'title' => 'Everything is built out of one repeatable shape.',
            'lede' => "Get the unit right and the rest is arithmetic. Here is exactly what one contains.",
            'blocks' => [
                [
                    'type' => 'list',
                    'title' => 'Inside a single unit',
                    'items' => [
                        "A hook: the one sentence that says why this matters to you now.",
                        "Teaching blocks: short prose, examples, and callouts. No 40-slide decks.",
                        "A knowledge check: four questions, instant feedback, best score kept.",
                        "A flashcard deck: the ideas compressed, tap to flip.",
                        "Field Work: the thing you go and do in the real world, then report back.",
                    ],
                ],
                [
                    'type' => 'live',
                    'title' => 'See it running',
                    'items' => [
                        ['title' => 'Unit 01: Mindset Hacks', 'body' => "The full public demo lesson, exactly as a student gets it. Blocks, knowledge check, flashcards, and the action.", 'href' => '/demo/lesson/', 'cta' => 'Open the Lesson'],
                    ],
                ],
                [
                    'type' => 'note',
                    'body' => "This is the single best thing to show someone first. It is the product in miniature, it needs no account, and it takes about four minutes.",
                ],
            ],
        ],

        // -------------------------------------------------------------
        [
            'id' => 'classroom',
            'num' => '04',
            'label' => 'The Classroom',
            'kicker' => 'The Product',
            'title' => 'Behind the login is a whole school, not a video list.',
            'lede' => "The part most people do not expect. It already exists, and it is the reason students come back on a Tuesday.",
            'blocks' => [
                [
                    'type' => 'stats',
                    'items' => [
                        ['value' => '17', 'label' => 'Badges', 'note' => 'Earned, not given'],
                        ['value' => '6', 'label' => 'Levels', 'note' => 'Freshman to Self Made'],
                        ['value' => '12', 'label' => 'Question finals', 'note' => 'Graded on the server'],
                    ],
                ],
                [
                    'type' => 'cards',
                    'items' => [
                        ['title' => 'XP and levels', 'body' => "Progress ladders from Freshman through Sophomore, Junior, Senior, and Valedictorian, up to Self Made.", 'tone' => 'acc'],
                        ['title' => 'Study Hall', 'body' => "Spaced review that pulls back the questions you got wrong, when you are due to see them again.", 'tone' => 'vio'],
                        ['title' => 'The Arena', 'body' => "Boss battles against the material. Games, because a streak is a better motivator than a reminder email.", 'tone' => 'coral'],
                        ['title' => 'Finals and the Diploma', 'body' => "A real final per course. Answer keys never reach the browser. Pass with 10 of 12 and it counts as honors.", 'tone' => 'acc'],
                        ['title' => 'Honor Roll and Office Hours', 'body' => "A weekly public board, and live sessions with real seats and a waitlist.", 'tone' => 'vio'],
                        ['title' => 'The Locker and Studio', 'body' => "Gear to earn and spend on, plus a faculty tool for drafting new units.", 'tone' => 'coral'],
                    ],
                ],
                [
                    'type' => 'live',
                    'title' => 'Open the real thing',
                    'items' => [
                        ['title' => 'The Classroom', 'body' => "Your dashboard, the day's plan, streak, and everything above. Signed in as you.", 'href' => '/learn/', 'cta' => 'Open Classroom'],
                        ['title' => 'The Faculty Lounge', 'body' => "Accounts, class progress, Act As, newsletter, backups, and the unit drafting Studio.", 'href' => '/learn/admin/', 'cta' => 'Open Admin'],
                    ],
                ],
            ],
        ],

        // -------------------------------------------------------------
        [
            'id' => 'scope',
            'num' => '05',
            'label' => 'What Exists',
            'kicker' => 'Honest Inventory',
            'title' => 'What is finished, and what is not.',
            'lede' => "Worth being straight about this in a demo. The skeleton is complete and the writing is in progress.",
            'blocks' => [
                [
                    'type' => 'table',
                    'head' => ['Course', 'Units mapped', 'Fully written', 'Status'],
                    'rows' => [
                        ['The 13th Grade', '24', '6', 'Live'],
                        ['The 14th Grade', '12', '3', 'Preview'],
                        ['The 15th Grade', '12', '3', 'Preview'],
                        ['Total', '48', '12', ''],
                    ],
                ],
                [
                    'type' => 'text',
                    'body' => "Every one of the 48 units has a title, a blurb, and a place in the ladder, so the full arc of the school is visible and navigable today. Twelve of them are written end to end with teaching blocks, a knowledge check, and a flashcard deck.",
                ],
                [
                    'type' => 'list',
                    'title' => 'Not done yet, and known',
                    'items' => [
                        "The filmed pieces. The structure expects them; they are not shot.",
                        "The remaining 36 units of writing.",
                        "Public launch. The classroom is invite-only and noindexed on purpose.",
                    ],
                ],
            ],
        ],

        // -------------------------------------------------------------
        [
            'id' => 'build',
            'num' => '06',
            'label' => 'How It Works',
            'kicker' => 'Under the Hood',
            'title' => 'A full school that runs on shared hosting.',
            'lede' => "Every architectural choice here was made to keep the thing cheap to run, impossible to break, and free of anything that can send a surprise bill.",
            'blocks' => [
                [
                    'type' => 'stats',
                    'items' => [
                        ['value' => '0', 'label' => 'Databases', 'note' => 'Flat JSON files'],
                        ['value' => '0', 'label' => 'Monthly platform cost', 'note' => 'Beyond the hosting'],
                        ['value' => '14', 'label' => 'API endpoints', 'note' => 'Plain PHP 8.3'],
                    ],
                ],
                [
                    'type' => 'cards',
                    'items' => [
                        ['title' => 'The site', 'body' => "Next.js and React, exported to plain HTML, CSS, and JavaScript. No server needed to render a page. It would run on a thumb drive.", 'tone' => 'acc'],
                        ['title' => 'The API', 'body' => "PHP 8.3 with flat JSON storage kept outside the web root, so a deploy can never overwrite student data.", 'tone' => 'vio'],
                        ['title' => 'Progress', 'body' => "Kept in the browser so it is instant, then synced to the account so it survives a new laptop.", 'tone' => 'coral'],
                    ],
                ],
                [
                    'type' => 'list',
                    'title' => 'Decisions worth defending',
                    'items' => [
                        "No database. At this size a database is an operational burden and a bill, not a feature.",
                        "Answer keys stay server-side. A static site would otherwise ship every final's answers to every visitor.",
                        "Roles are enforced by the server, never by the interface. Hiding a button is not security.",
                        "Animation is an enhancement. If the JavaScript fails, every word is still on the page.",
                        "This walkthrough is served from the API for the same reason as the answer keys: what you are reading was never in the bundle.",
                    ],
                ],
            ],
        ],

        // -------------------------------------------------------------
        [
            'id' => 'story',
            'num' => '07',
            'label' => 'The Build',
            'kicker' => 'How It Got Made',
            'title' => 'Five days, 88 commits, one operator.',
            'lede' => "This is the part that tends to stop the room. The whole thing above was designed, written, built, and shipped in under a week.",
            'blocks' => [
                [
                    'type' => 'stats',
                    'items' => [
                        ['value' => '5', 'label' => 'Days', 'note' => '08-11-2026 to 08-15-2026'],
                        ['value' => '88', 'label' => 'Commits', 'note' => 'All shipped'],
                        ['value' => '20.4k', 'label' => 'Lines', 'note' => 'Site, classroom, and API'],
                    ],
                ],
                [
                    'type' => 'table',
                    'head' => ['Layer', 'Files', 'Lines'],
                    'rows' => [
                        ['TypeScript and React', '76', '11,249'],
                        ['Styles', '1', '7,302'],
                        ['PHP API', '15', '1,882'],
                    ],
                ],
                [
                    'type' => 'text',
                    'body' => "It was built with Claude Code: the developer sits with an AI that reads the codebase, writes into it, runs the build, opens the result in a real browser, and checks its own work. Not autocomplete. The full loop, including the parts that are usually the slow parts.",
                ],
                [
                    'type' => 'list',
                    'title' => 'What the loop actually looks like',
                    'items' => [
                        "The design spec and high-fidelity prototypes come first, and stay the source of truth.",
                        "Work happens in small verified pieces, each one committed and pushed before the next begins.",
                        "Changes get opened in a browser and looked at, not just compiled and assumed.",
                        "The person stays the editor: the taste, the copy standards, and the calls are theirs.",
                    ],
                ],
                [
                    'type' => 'note',
                    'body' => "The honest version of the pitch: this is not a story about typing faster. It is that the distance between deciding something and seeing it live collapsed to about a minute, so far more gets tried, and the bad ideas get discovered and thrown away the same day.",
                ],
            ],
        ],

        // -------------------------------------------------------------
        [
            'id' => 'next',
            'num' => '08',
            'label' => "What's Next",
            'kicker' => 'The Road',
            'title' => 'Where this goes from here.',
            'lede' => "In the order it matters.",
            'blocks' => [
                [
                    'type' => 'list',
                    'title' => 'Next up',
                    'items' => [
                        "Film the units. The structure is waiting for them.",
                        "Finish the writing, 36 units to go.",
                        "Open the founding class off the waitlist.",
                        "Move storage to a real database only if the flat files stop being enough.",
                    ],
                ],
                [
                    'type' => 'text',
                    'body' => "The sequencing is deliberate. Nothing on this list requires rebuilding anything above it. The classroom, the finals, the certificate, and the accounts already work and will not be touched to add video.",
                ],
            ],
        ],

        // -------------------------------------------------------------
        [
            'id' => 'run',
            'num' => '09',
            'label' => 'Presenter Notes',
            'kicker' => 'For You',
            'title' => 'A ten-minute version of this.',
            'lede' => "A path through the demo that tends to land, when you have someone's attention and not much of their time.",
            'blocks' => [
                [
                    'type' => 'list',
                    'title' => 'The order that works',
                    'items' => [
                        "Say the name and stop talking. The 13th Grade explains itself and they will react.",
                        "Open the demo lesson and scroll it. Do not narrate, let them read a block.",
                        "Take the knowledge check and get one wrong on purpose, to show the feedback.",
                        "Open the classroom. The badges, levels, and streak are what makes it feel like a school.",
                        "Come back here to chapter 07 and tell them it took five days.",
                    ],
                ],
                [
                    'type' => 'live',
                    'title' => 'Everything, one click away',
                    'items' => [
                        ['title' => 'Home', 'body' => "The public marketing site, top to bottom.", 'href' => '/', 'cta' => 'Open Home'],
                        ['title' => 'Demo Lesson', 'body' => "Unit 01, public, no account needed.", 'href' => '/demo/lesson/', 'cta' => 'Open Lesson'],
                        ['title' => 'Classroom', 'body' => "The signed-in student experience.", 'href' => '/learn/', 'cta' => 'Open Classroom'],
                        ['title' => 'About', 'body' => "The story and the people behind it.", 'href' => '/about/', 'cta' => 'Open About'],
                    ],
                ],
                [
                    'type' => 'note',
                    'body' => "This page is signed-in and administrator-only. Anyone watching your screen sees it; nobody reaches it from a link. Sign out and it is gone.",
                ],
            ],
        ],
    ],
];

respond(200, ['ok' => true] + $doc);
