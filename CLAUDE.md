# Self Made School — website

Marketing site for Self Made School: courses The 13th Grade (intro), The 14th Grade (money), The 15th Grade (big calls). Two pages: Home, About.

## Source of truth
`design/README.md` is the full design spec (tokens, layouts, animation timings). `design/*.dc.html` are the high-fidelity prototypes — open them in a browser to see intended look and motion (keep `design/support.js` next to them; do not ship it). `design/screenshots/` has section-by-section captures.

## Stack
Next.js (App Router) + React. Animations: GSAP 3 + ScrollTrigger (`npm install gsap`), initialized in client components via `gsap.context`/`useGSAP`; register ScrollTrigger once. Do NOT port the prototype's script-injection/watchdog loader — load GSAP normally.

## Build plan
1. Scaffold: `npx create-next-app@latest . --ts --app --eslint`
2. `app/page.tsx` = Home, `app/about/page.tsx` = About; shared `Nav` and `Footer` components.
3. Recreate pixel-perfectly from the spec: colors `#0E0E12` ink / `#F2EEE3` cream / `#43DE7B` green / `#5B7CFA` cobalt / `#FFB43A` amber; fonts Bricolage Grotesque (display) + Instrument Sans (body) via `next/font/google`.
4. Animations per spec: hero line reveals, marquee, scroll reveals (`once: true`), pinned horizontal How It Works, counters. Respect `prefers-reduced-motion`.
5. Reveal styling is progressive enhancement — content must never stay hidden if JS fails.

## Conventions
- Title Case for all buttons, links, nav items, CTA labels (e.g. "See the Syllabus", "Enroll Free", "How It Works").
- CTAs are visual for now — no signup backend yet.
