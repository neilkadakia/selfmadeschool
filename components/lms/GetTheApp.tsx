"use client";

// "Take the classroom with you": the app pitch, on the desk.
//
// The store links are not live yet. Rather than point two buttons at "#" and
// let somebody click into nothing, an empty href renders the button as a
// plainly-labeled Coming Soon. Fill in STORES below and each one becomes a
// real link with no other change.

const STORES = {
  ios: { href: "", label: "App Store", sub: "Download on the" },
  android: { href: "", label: "Google Play", sub: "Get It On" },
} as const;

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="app-store-mark" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.05 12.54c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.18-1.72-1.35-.14-2.64.8-3.33.8-.69 0-1.75-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.65-.39 6.57 1.1 8.72.73 1.05 1.6 2.23 2.74 2.19 1.1-.05 1.52-.71 2.85-.71 1.33 0 1.71.71 2.87.69 1.19-.02 1.94-1.07 2.66-2.13.84-1.22 1.19-2.4 1.21-2.46-.03-.01-2.32-.89-2.34-3.53zM14.88 5.9c.61-.74 1.02-1.77.91-2.8-.88.04-1.94.59-2.57 1.32-.56.65-1.05 1.7-.92 2.7.98.08 1.98-.5 2.58-1.22z"
      />
    </svg>
  );
}

function PlayMark() {
  return (
    <svg viewBox="0 0 24 24" className="app-store-mark" aria-hidden="true">
      <path fill="#43DE7B" d="M3.6 2.2 13.4 12 3.6 21.8a1.5 1.5 0 0 1-.5-1.1V3.3c0-.43.19-.82.5-1.1z" />
      <path fill="#FFB43A" d="m16.3 8.9 2.9 1.66c.95.55.95 1.33 0 1.88l-2.9 1.66L13.4 12z" />
      <path fill="#5B7CFA" d="M3.6 2.2c.28-.25.7-.29 1.1-.06l11.6 6.76L13.4 12z" />
      <path fill="#FF9DE2" d="M3.6 21.8 13.4 12l2.9 3.1L4.7 21.86c-.4.23-.82.19-1.1-.06z" />
    </svg>
  );
}

function StoreButton({
  store,
  mark,
}: {
  store: { href: string; label: string; sub: string };
  mark: React.ReactNode;
}) {
  const inner = (
    <>
      {mark}
      <span className="app-store-text">
        <span className="app-store-sub">{store.href ? store.sub : "Coming Soon To"}</span>
        <span className="app-store-name">{store.label}</span>
      </span>
    </>
  );

  if (!store.href) {
    return (
      <span className="app-store is-soon" aria-disabled="true">
        {inner}
      </span>
    );
  }
  return (
    <a className="app-store" href={store.href} target="_blank" rel="noreferrer">
      {inner}
    </a>
  );
}

export default function GetTheApp() {
  return (
    <section className="app-band" aria-label="Get the app">
      <span className="app-band-glow" aria-hidden="true" />

      <div className="app-band-inner">
        <div className="app-band-copy">
          <p className="kicker kicker--acc">The Classroom, In Your Pocket</p>
          <h2 className="app-band-h">Built for the phone first.</h2>
          <p className="app-band-p">
            Everything on this desk travels: every unit, every knowledge check, the flashcards,
            the Arena, your streak and your XP. Office Hours ring on your phone instead of in a
            tab you forgot to leave open, and downloaded units keep working on a bus with no
            signal. Start a unit on the laptop, finish it at a bus stop, and the school knows
            where you left off either way.
          </p>

          <div className="app-store-row">
            <StoreButton store={STORES.ios} mark={<AppleMark />} />
            <StoreButton store={STORES.android} mark={<PlayMark />} />
          </div>

          <p className="app-band-note">
            Free, the same as the classroom. Your account and everything in it comes with you.
          </p>
        </div>

        <div className="app-band-art" aria-hidden="true">
          <div className="app-phone">
            <span className="app-phone-notch" />
            <div className="app-phone-screen">
              <div className="app-scr-top">
                <span className="app-scr-hi">Good morning</span>
                <span className="app-scr-streak">
                  <svg viewBox="0 0 24 24" className="app-scr-flame">
                    <path
                      d="M12 2c.5 3.5-1.8 5.2-3.2 7C7.3 10.9 6 12.7 6 15a6 6 0 0 0 12 0c0-2.6-1.3-4.3-2.4-5.8C14.3 7.4 13.4 5.6 14 3c-1 .4-1.8 1.4-2 2.5C11.8 4.3 11.7 3 12 2z"
                      fill="currentColor"
                    />
                  </svg>
                  12
                </span>
              </div>

              <div className="app-scr-ring">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" className="app-scr-track" />
                  <circle cx="50" cy="50" r="42" className="app-scr-fill" />
                </svg>
                <span className="app-scr-ring-n">68%</span>
              </div>

              <p className="app-scr-label">The 13th Grade</p>

              <div className="app-scr-row is-done">
                <span className="app-scr-dot" />
                <span className="app-scr-bar" />
              </div>
              <div className="app-scr-row is-now">
                <span className="app-scr-dot" />
                <span className="app-scr-bar" />
              </div>
              <div className="app-scr-row">
                <span className="app-scr-dot" />
                <span className="app-scr-bar" />
              </div>

              <div className="app-scr-tabs">
                <span className="is-on" />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
