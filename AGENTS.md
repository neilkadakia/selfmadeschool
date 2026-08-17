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
