# Handoff: Self Made School Marketing Website

## Overview
Marketing site for **Self Made School**, an education company teaching 18–30-year-olds adulting, money, and life decisions through three courses: **The 13th Grade** (intro: mindset + money + big calls), **The 14th Grade** (personal finance), **The 15th Grade** (emotional intelligence, purpose, the big life decisions). Two pages: Home and About. Dark, bold, energetic aesthetic with GSAP-driven scroll animation.

## About the Design Files
The files in this bundle are **design references created in HTML**: high-fidelity prototypes showing intended look and behavior, not production code to copy directly. The target codebase is **`neilkadakia/selfmadeschool` (Next.js / React)**; the repo is empty at handoff time, so scaffold a fresh Next.js app and recreate these designs as React components (suggested: `app/page.tsx` for Home, `app/about/page.tsx` for About, shared `Nav`/`Footer` components, `npm install gsap` with `useGSAP`/`gsap.context` inside a client component). Register ScrollTrigger once, and keep all animation values from the Interactions section below.

To preview locally: keep all three files in one folder and open `Self Made School.dc.html` in a browser (`support.js` is the prototype runtime; it is NOT needed in production).

> **Important:** the prototype loads GSAP by injecting script tags and polling (a workaround for the prototype environment). In production, just load GSAP + ScrollTrigger normally (npm `gsap` or CDN `<script>`) and run the init once on DOMContentLoaded. The `loadEngine`/watchdog machinery should NOT be ported.

## Fidelity
**High-fidelity.** Colors, type, spacing, copy, and animations are final-intent. Recreate pixel-perfectly.

## Design Tokens
Colors:
- `--ink: #0E0E12`: page ground (near-black)
- `--paper: #F2EEE3`: cream sections + light text on ink
- `--acc: #43DE7B`: primary accent (growth green) for CTAs, marquee band, enroll section bg
- `--vio: #5B7CFA`: cobalt secondary
- `--coral: #FFB43A`: amber tertiary
- Muted text: `rgba(242,238,227,0.75)` on ink; `rgba(14,14,18,0.75)` on paper

Typography:
- Display: **Bricolage Grotesque** 800 (Google Fonts), uppercase, letter-spacing −0.02…−0.03em, line-height 0.92–1.02. Hero `clamp(58px, 11vw, 168px)`; section H2 `clamp(40px, 6vw, 84px)`; giant card numerals 88–110px.
- Body/UI: **Instrument Sans** 400–700. Body 16–19px/1.5–1.55; card titles 26–27px/700/−0.02em; nav links 14px/500, uppercase, letter-spacing 0.08em; kickers 14px/700, uppercase, letter-spacing 0.22em.

Radii: cards 24px; horizontal panels 32px; buttons/pills/tags 999px.
Shadows: card hover `0 18px 44px rgba(0,0,0,0.28)`.
Texture: fixed full-viewport SVG fractal-noise grain overlay, opacity 0.38, `mix-blend-mode: overlay`, pointer-events none, z-index 90.

## Screens / Views

### Home (`Self Made School.dc.html`)
1. **Nav**: fixed, full-width, `rgba(14,14,18,0.55)` + `backdrop-filter: blur(12px)`, 1px bottom border `rgba(242,238,227,0.08)`, padding 18px 32px. Left: green circle badge "SM" (34px, rotated −8°) + "SELF MADE SCHOOL" (Bricolage 22px). Right: links Syllabus / The Grades / How It Works / Receipts / About + green pill button "Enroll Free" (hover: white bg).
2. **Hero**: 100vh flex column centered, padding 140px 32px 60px. Full bleed on purpose: the headline runs to the edge of the page rather than sitting in the 1240px container the sections below use. Background, back to front: graph paper (minor rule every 76px, major every fourth, radially masked), a few squares of it filling in on long slow cycles, a circle of brighter green ruling that follows the cursor, a green and a cobalt glow drifting behind it and leaning away from the pointer, dawn along the bottom edge meeting the green marquee band, a vignette, and grain at 0.06. The paper stays put while the light moves, so the 1px ruling stays sharp. Kicker "★ Pre-launch" (green). H1 three stacked clipped lines: "School never / taught you / this." ("this" green, period amber). Two rotated sticker pills, absolute right side: "no pop quizzes ✓" (cobalt, +7°), "actually free" (amber, −6°). Sub-paragraph (max 460px) + buttons "Enroll Free →" (green pill) and "See the Syllabus" (outlined pill, hover green border/text).
3. **Marquee band**: full-width green band rotated −1.5° (scale 1.02), 2px ink borders, Bricolage 22px uppercase ticker "Mindset ★ Money ★ Habits ★ Big calls ★ Taxes ★ Credit ★ 401(k) ★ Negotiation ★" duplicated 2× so the loop has no visible seam.
4. **Syllabus** (`#syllabus`): cream section, padding 110px 32px 120px, max-width 1240px. Kicker (cobalt) "The 13th Grade · Intro Course Syllabus"; H2 "Six units. Zero lectures about the mitochondria." Grid `repeat(auto-fit, minmax(320px, 1fr))`, gap 22px; six cards (min-height 240px, padding 34px 30px): each has top row (UNIT NN label 13px + lesson-count pill) and bottom block (title 27px + body 16px). Card backgrounds in order: ink, cobalt, green, amber, white (2px ink border), ink. Units: Money 101 / Tax Season, Decoded / Credit Glow-Up / Mindset Hacks / Invest, Eventually / The Big Calls (copy in file).
5. **The Grades** (`#grades`): day into night, `linear-gradient(180deg, --deep 0%, #141834 44%, --ink 100%)`, padding 118px 32px 150px, so it breaks hard under the cream Syllabus and lands on ink for How It Works. Kicker (amber) "The Grades"; H2 "School's back on. Three grades to go." Three glass cards (min-height 380px, padding 40px 34px, 1px tone border): course tone rising from the floor as a radial glow, giant colored numeral (13 green / 14 cobalt / 15 amber, 88px, filled with a top-down fade of its own tone via `background-clip: text`, no glow) + status pill (Start Here / Next Up / Final Year) + title + body + colored text link. A 3px top rail runs 34% / 67% / 100% of the card width, and above 1000px the cards step up 0 / −30px / −60px.
6. **How It Works** (`#how`): cream section, the light moment between two dark ones (The Grades lands on ink above it, Receipts starts on ink below). **Pinned horizontal scroll**: header ("Five steps. Keep scrolling →", arrow animates right then turns down) then a flex track of five panels `min(42vw, 440px)` wide, min-height 360px, radius 28px, gap 28px, each with a 20px/44px shadow so it lifts off the cream: 01 Read (green) / 02 Watch (cobalt) / 03 Do (amber) / 04 Flex (pink) / 05 Repeat (ink). Same chrome as the grade cards: a top rail running 20/40/60/80/100% of the panel width, an 88px numeral fading toward its baseline via `background-clip: text`, and a 68px icon out on the right margin opposite it. Track translates horizontally while section is pinned (see Interactions).
7. **Receipts** (`#receipts`): ink, top border `rgba(242,238,227,0.1)`. Five stat blocks (2px colored top border, numeral Bricolage 72px, label 15px uppercase): 24/24 13th Grade units live / 20 min Average unit / $0 Tuition forever / 0 Parabolas / 100% Real life relevance. The row counts as one cascade 0.16s apart; tuition falls from $1,000 and parabolas from 100, and every column is pre-sized to the widest value it passes through. Below: centered blockquote (Bricolage 700, `clamp(26px,3.6vw,44px)`) "I came for the money stuff. The mindset unit is the one I keep re-watching." with cite Maya, 24 · The 13th Grade, Class of '26 (green).
8. **Enroll** (`#enroll`): full green section, centered, padding 120px 32px. Kicker "Enrollment is open"; H2 "Your first adult decision? This one." (`clamp(44px,8vw,120px)`); ink pill button "Start the 13th Grade · Free" (hover: cobalt bg, white text); footnote "No credit card. Ironically."
9. **Footer**: ink, space-between: "SELF MADE SCHOOL" (Bricolage 18px), links (Syllabus / How It Works / About / Enroll), "© 2026 Self Made School. Not actual financial advice. Actual life advice."

### About (`About.dc.html`)
Same nav (About link highlighted green, links point back to Home anchors) and footer.
1. **Hero**: 82vh, same left margin as the sections below it, the home hero’s field in a quieter form (graph paper, one green glow, vignette, grain, no cursor light), kicker "★ About Self Made School", H1 "Nobody is born / knowing this stuff." ("this stuff" green), sub-paragraph max 560px.
2. **Why we exist**: cream section, kicker (cobalt), H2 "Adulthood is a curriculum. Someone should teach it." (max 20ch), paragraph max 620px.
3. **Three house rules**: ink section, three cards (min-height 260px; green / cobalt / amber). Each: numeral 01–03 (Bricolage 56px) + title 26px + body. Titles: "Plain English or nothing" / "Doing beats knowing" / "No shame in the syllabus".
4. **Who we are**: cream section, kicker (cobalt), H2 "It started as a letter to three daughters.", a 660px column of plain paragraphs: the founder (Neil Kadakia, a father of three young daughters) writing down what he wished someone had handed him at eighteen, then the educators who have shaped every unit since, then the turn from three daughters to everyone. Closes on a Bricolage line at `clamp(22px, 2.6vw, 30px)` in ink and a small uppercase signature under a hairline rule.
5. **CTA**: green section, "Class starts whenever you do." + ink pill "Start With the 13th Grade" → Home `#enroll`.

## Interactions & Behavior (GSAP 3.12.5 + ScrollTrigger)
All animation uses GSAP; scroll-linked effects use ScrollTrigger.
- **Hero intro (page load):** kicker `from {y:20, opacity:0, 0.7s, power3.out}`; headline lines `from {yPercent:115, 1.05s, stagger 0.1, power4.out}` inside `overflow:hidden` line wrappers; hero sub + buttons `from {y:30, opacity:0, 0.8s, stagger 0.12, delay 0.55}`; stickers `from {scale:0, opacity:0, 0.7s, stagger 0.14, delay 0.8, back.out(2.2)}`; watermark `from {opacity:0, x:80, 1.4s}`.
- **Watermark parallax:** `to {y:160}` scrubbed over hero (`start: 'top top', end: 'bottom top'`).
- **Marquee:** infinite `to {xPercent:-50, duration:22, ease:'none', repeat:-1}` on the duplicated track. Duration 22s (design intent: tweakable 8–60s).
- **Scroll reveals:** cards `from {y:70, opacity:0, rotation:±2.5, 0.9s, power3.out}`; other `[data-reveal]` blocks `from {y:44, opacity:0, 0.9s}`. Trigger when element enters viewport (prototype uses IntersectionObserver at threshold 0.12 for reliability inside the design tool; in production `ScrollTrigger start:'top 88%', once:true` is equivalent and preferred). Elements must never be left hidden if JS fails; treat reveal styling as progressive enhancement.
- **Pinned horizontal scroll (#how):** pin the section, scrub the track `x` from 0 to `-(track.scrollWidth − innerWidth + 64)`, `end: '+=' + distance`, `scrub: 1`, `invalidateOnRefresh: true`. Call `ScrollTrigger.refresh()` after fonts/images load.
- **Counters (#receipts):** on first reveal, tween a value 0→target over 1.6s (power2.out) writing `prefix + Math.round(v) + suffix` ("40+", "10 min", "$0", "0"; the $0 and 0 render statically).
- **Card hovers (CSS):** `translateY(-6px)` + shadow `0 18px 44px rgba(0,0,0,0.28)`, transition `transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s ease`. Buttons/pills: color swaps per style-hover values in the files. Links hover to green.
- **Navigation:** in-page anchor links (`#syllabus`, `#grades`, `#how`, `#receipts`, `#enroll`); cross-page links Home ↔ About. Respect `prefers-reduced-motion` in production (skip intro/scrub animations).

## State Management
None beyond animation state. No data fetching. Email capture/enroll buttons are visual CTAs; wire to your signup flow. Design-time tweakables (accent color, grain on/off, marquee speed) can become CSS-variable theming if desired.

## Assets
- Google Fonts: Bricolage Grotesque (opsz 12..96, wght 400..800), Instrument Sans (wght 400..700 + italics).
- Grain: inline data-URI SVG (`feTurbulence fractalNoise baseFrequency 0.9`, 160×160 tile), included in the files.
- No raster images. Icons/stars are text glyphs (★, ✓, →).

## Screenshots
`screenshots/` holds full-viewport captures for quick visual reference (the film-grain overlay doesn't survive the capture process; it IS present in the live files): `01-home` hero → `02-home` syllabus → `03-home` grades → `04-home` horizontal how-it-works (mid-pin) → `05-home` receipts/quote → `06-home` enroll; `01–04-about` hero → mission → house rules → CTA/footer. The live HTML files are the source of truth for color and motion.

## Files
- `Self Made School.dc.html`: Home page (markup in `<x-dc>`, animation logic in the `data-dc-script` block at the bottom).
- `About.dc.html`: About page (same structure).
- `support.js`: prototype runtime only; open the pages locally with it, do not ship it.
- `screenshots/`: reference captures of every section.
