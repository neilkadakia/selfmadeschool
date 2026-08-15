# Dawn Sweep logo: drop-in for neilkadakia/selfmadeschool@main

The locked wordmark underline now sweeps amber → green (the "Dawn Sweep").

## What to copy
- `components/Wordmark.tsx`: NEW, the underlined wordmark as a component (gradient id passed per-instance to keep SVG ids unique).
- `components/Nav.tsx`: replaces the SM badge + plain text with `<Wordmark gid="dawn-nav" />`.
- `components/Footer.tsx`: footer brand becomes `<Wordmark gid="dawn-footer" />`.
- `app/icon.svg`: the favicon, a sweep-and-arrow icon with the dawn gradient.

## How to ship
1. Copy these four files into the repo at the same paths (Wordmark.tsx is new; the rest overwrite).
2. Commit to `main`; your deploy picks it up automatically.

No CSS changes needed; `.nav-badge` styles in globals.css become unused and can be deleted whenever.
