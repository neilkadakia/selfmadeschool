<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
# Self Made School website

Marketing site for Self Made School: courses The 13th Grade (intro), The 14th Grade (money), The 15th Grade (emotional intelligence, purpose, the big calls). Two pages: Home, About.

## Source of truth
`design/README.md` is the full design spec (tokens, layouts, animation timings). `design/*.dc.html` are the high-fidelity prototypes: open them in a browser to see intended look and motion (keep `design/support.js` next to them; do not ship it). `design/screenshots/` has section-by-section captures.

## Stack
Next.js (App Router) + React. Animations: GSAP 3 + ScrollTrigger (`npm install gsap`), initialized in client components via `gsap.context`/`useGSAP`; register ScrollTrigger once. Do NOT port the prototype's script-injection/watchdog loader; load GSAP normally.

## Build plan
1. Scaffold: `npx create-next-app@latest . --ts --app --eslint`
2. `app/page.tsx` = Home, `app/about/page.tsx` = About; shared `Nav` and `Footer` components.
3. Recreate pixel-perfectly from the spec: colors `#0E0E12` ink / `#F2EEE3` cream / `#43DE7B` green / `#5B7CFA` cobalt / `#FFB43A` amber; fonts Bricolage Grotesque (display) + Instrument Sans (body) via `next/font/google`.
4. Animations per spec: hero line reveals, marquee, scroll reveals (`once: true`), pinned horizontal How It Works, counters. Respect `prefers-reduced-motion`.
5. Reveal styling is progressive enhancement: content must never stay hidden if JS fails.

## The LMS
`/learn` is a working multi-course LMS on top of the marketing site: units, quizzes,
flashcards, XP, badges, the Arena, Study Hall, server-graded finals, certificates.
Student progress is one JSON blob per account, owned by the browser and synced to
`api/progress.php`.

## Study Hall is a schedule, not a pile
`lib/mastery.ts` runs Leitner boxes: 1, 3, 7, 21, 60 and 180 days. Every answer
books the next one, right climbs a box, wrong drops to the bottom. Nothing ever
retires, it only gets quieter, so a unit finished in March is still checked in
June. Entries written before scheduling existed carry no `box`/`due`, so
`readEntry()` reads them as what they were; never assume those fields exist.
Boxes over SM-2 deliberately: a student can be told the whole rule in a sentence.
`npm run test:review` covers the ladder, the drop, the migration and the queue.

Session lists in Study Hall are memoized on the size of the history, not on
`loaded` alone: for a signed-in student `loaded` flips on the local read, before
the server blob lands, and a list snapshotted then is empty for the whole visit.

## Pace, not drip
Teachable and Kajabi pace with drip: the creator decides when you may see the
next part. Wrong tool for a school whose pitch is a year you can take on your
own, so `lib/pace.ts` lets the **student** set units-per-week and just keeps an
honest count. Nothing locks.

This needed a new fact: `done` is a bare list, so completions had no dates.
`LmsState.doneAt` now stamps them **from the day it shipped**, and the card says
plainly when its count is short because older units predate the log. That also
means a completions-over-time chart is becoming possible for the first time; it
is still wrong to draw one over the undated years. `npm run test:pace`.

## The classroom works offline
`public/sw.js` is a hand-written service worker; `components/lms/Offline.tsx`
registers it and shows the offline notice. Three rules in order: **the API is
never cached** (a stale answer from the Registrar or the bell is worse than an
honest failure), hashed `/_next/static` assets are cache-first forever, pages
are network-first with a cache fallback and `/offline/` last.

"Take This Course Offline" (`SaveOffline.tsx`) posts the unit URLs to the
worker. Caching a page's HTML is **not enough**: the lesson lives in the route's
JavaScript, so the worker parses each document for `/_next/` assets and pulls
those too. Bump `VERSION` in sw.js whenever the worker changes, or browsers
keep the old one. Verified by `tools/qa/offline-check.js` and
`save-offline-check.js`, which pull the plug for real.

## Search reads the lessons
`lib/search.ts` indexes every block, takeaway, flashcard, quiz question and
Field Work action, lazily on first search, and returns one row per unit with the
line it matched. Quiz *options* are deliberately excluded: three of four are
wrong, and surfacing a wrong answer as a search result teaches the wrong thing.
`npm run test:search`.

## A lesson is blocks, and nine of them are pictures
Beyond prose a lesson can carry **`split`** (the same moment two ways),
**`steps`** (a numbered flow with a spine), **`bars`**, **`flow`** (a sequence,
or a cycle with `loop`), **`timeline`**, **`receipt`** (a calculation worked in
the open, the money workhorse), **`scale`**, **`table`**, and **`art`**, which
names one of six drawings specific to Unit 01. All but `art` are generic: a
unit fills one with its own numbers rather than asking for a bespoke drawing,
which is what made illustrating thirty units possible at all.

Renderers: `components/lms/LessonGraphic.tsx` (the eight generic) and
`LessonArt.tsx` (the six named). Both carry structure, never bytes, so a lesson
stays a plain object `api/content.php` and the phone app can read.

**Design, and this was got wrong once.** A block that carries a tone is a
**solid fill with ink text**, the way the Read / Watch / Do panels and the
syllabus cards are. Never a dark tile with a tinted wash and a coloured band
down one edge: that is the default look every AI reaches for, the user has
banned it outright, and it belongs to no design this site uses. Reference
material that reads like a document (a receipt, a table) inverts to cream.
Steps, timelines, bars and scales are drawn straight onto the page with a
spine, a dot or a bar and no container. Numbers are Bricolage and large.

**Words in a picture are DOM text, never SVG `<text>`**: a 600-unit viewBox on
a phone turns 15px type into 8px, and this is read on phones. A drawing is one
image with one written sentence: the frame carries `role="img"` and the `alt`
line, which is also what search indexes and what the phone app shows, since
Expo has no SVG here. Because the shape layer stretches to its frame, circles
are HTML markers positioned by percentage and connectors use only vertical and
horizontal segments.

`.gfx-tb-scroll` carries `contain: inline-size` and it is load-bearing:
without it a table's `min-width` propagates as a min-content floor up through
`.lms-main` and widens the entire lesson column on a phone, which `body`'s
`overflow-x: hidden` then hides, so the page looks fine while every graphic on
it is quietly off-screen.

Add a drawing in three places: the id in `LessonArt` (`lib/lms.ts`), the case
in `LessonArt.tsx`, and the name in the allowed list in `api/copilot.php`,
which refuses an unknown one rather than shipping a blank frame.

## Every unit is a lesson, and the audit says so
`npm run audit:lessons` (`scripts/lesson-audit.ts`) is the acceptance gate for
curriculum, next to `audit:quiz` for the knowledge check. It fails on em and en
dashes, the banned vocabulary, a body under 1,400 words, fewer than two
graphics, four plain paragraphs in a row, a missing takeaway or Field Work
line, and any quiz explanation that names an option by position, which is wrong
the moment it renders because `lib/shuffle.ts` moves the options on every
attempt. Words that are banned in one sense and ordinary in another (`kids` for
the reader's own children, `leverage` as the noun for bargaining power) are
warnings for a person to read, never failures.

Curriculum numbers change, so tests must not pin a sentence. `scripts/search-test.ts`
pulls its query out of a real paragraph at runtime for exactly that reason.

## The Quad and the Register
`/learn/quad` is the community: clubs are rooms, each with its own members, feed
and posting rule. House clubs are seeded once into the `clubs` store; a club per
course is folded in from `api/catalog.json` on every read, so a new course brings
its room with it and the school never opens as an empty room. Course clubs go
through `course_access()`, so turning payment on closes the room and the course
together. Reactions are named (Like, Celebrate, Insightful, Support) and drawn as
line icons, never emoji. Rooms open as in-page state, not routes, which sidesteps
dynamic routes under static export.

`/learn/register` is the student directory: names, levels, clubs and kudos. Two
rules hold it. Emails never reach a student, so kudos are addressed by a derived
handle rather than an address. And being listed is a choice: `unlisted` on the
user record takes somebody out of it and nothing else. There is deliberately no
private mail anywhere in here; everything students say to each other happens in a
room the whole school can see, which is also what makes moderation tractable.

Kudos are their own currency, counted server-side, and never XP. XP lives in the
progress blob the browser owns and overwrites wholesale, so a server-side grant
would not survive the next sync.

## The Faculty Lounge
`/learn/faculty` is the staff side, one room per file under `components/faculty/`.
It shares the classroom shell: `Classroom.tsx` swaps its sidebar nav when the path
is under `/learn/faculty`. The old `/learn/admin` forwards here.

Rooms by rank: Front Desk, Gradebook, Field Work, Study Group, The Quad, The
Bulletin, The Studio and Records (educator); Front Office and Enrollment
(administrator); School Ops (Global Administrator). The Student File is a drawer,
not a route, which keeps context and sidesteps dynamic routes under static export.

### Rules that hold this together
- **The client owns progress; the server owns everything faculty writes.** Replies,
  notes, assignments, homerooms and grants live in their own stores, because the
  browser overwrites the progress blob wholesale on every sync.
- **The server never hard-codes curriculum.** `scripts/export-final-keys.ts` writes
  `api/final-keys.json` (answers) and `api/catalog.json` (course and unit titles,
  question prompts) on every build. Both are denied to the web by `api/.htaccess`.
  If PHP needs to know something about a course, add it there.
- **One access gate.** `course_access()` in `api/_lib.php` decides who may open a
  course, and every content path goes through it. Note its limit: this is a static
  export, so lesson text ships in the JS bundle regardless. Selling a course for
  real means serving lessons from the API first.
- **Five optional rooms, all off until asked for.** `prereqs` (a course needs
  the one before it, checked inside `course_access()` so there is still one
  gate), `forms` (`api/forms.php`, Ask the School: polls are public once you
  have answered so nobody is anchored by the majority; written answers reach
  faculty with a name and no other student), `broadcast` (`api/broadcast.php`,
  one composer with a delivery row per person; the bell always rings, email is
  a separate tick that respects `nudgesOff`), `calendarLinks` (Google and
  Outlook beside the .ics), `certVerify` (`api/verify.php`, **the only endpoint
  that answers without a session** — it returns a name, a course, a date and
  nothing else, and is 404 unless switched on). `npm`-free suite:
  `tools/qa/options-test.sh`, 39 assertions, and it leaves every switch off.
- **Every switch defaults off.** `read_settings()` holds the feature flags (paid,
  deadlines, homerooms). The school ships free, open and self-paced; School Ops is
  the only place that changes that, and changes land in the audit log.
- **Records only reports what the data can prove.** Unit completions carry no
  timestamp, so there is no completions-over-time chart. Do not add one. The same
  rule shapes the Quad feed: it carries posts, kudos and passed finals, because
  those know when they happened. Completions are not in it for the same reason.
- **Slow work happens after the response.** `respond_then()` answers the caller,
  then sends mail. Never make somebody wait on `mail()`. Watch for the loop
  version of this: cancelling Office Hours mails every seat-holder, which used
  to be thirty blocking calls before the teacher heard anything back.
- **Cron jobs authorize with a key, not a session.** `backup.php`, `nudge.php`
  and `sessions.php` each mint a secret into the `ops` store and accept
  `?key=`; School Ops shows the curl line. Reminder passes record who they have
  already told, so running one twice is harmless.
- **Calendar files are written in the browser.** A plain link cannot carry the
  auth header, and the student already holds everything the file needs, so
  `lib/ics.ts` builds the `.ics` client-side. Keep the line folding: readers
  break on fields over 75 octets.

## Conventions
- Title Case for all buttons, links, nav items, CTA labels (e.g. "See the Syllabus", "Enroll Free", "How It Works").
- CTAs are visual for now; no signup backend yet.
- Never "module" in student-facing copy: a unit is an online lesson, a video is a
  filmed piece. Students are adults, never "kids". US phone and date formats via
  `lib/format.ts`.
