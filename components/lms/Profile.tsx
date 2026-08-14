"use client";

// Your page: identity, appearance, security, insights, and your data.
// Everything editable in one place; everything syncs to the account.

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { COURSES, BADGES, levelFor } from "@/lib/lms";
import { auraFor } from "@/lib/game";
import { apiUpdateProfile, apiChangePassword, type AuthUser } from "@/lib/api";
import { useLms, courseProgress } from "@/components/useLms";
import AvatarStudio from "./AvatarStudio";
import Portrait from "./Portrait";
import RewardToast from "./RewardToast";
import Ring from "./Ring";

export default function Profile() {
  const lms = useLms();
  const { state, loaded, auth } = lms;
  const [first, setFirst] = useState<string | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [dob, setDob] = useState<string | null>(null);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [msg, setMsg] = useState("");
  const [resetArmed, setResetArmed] = useState(false);
  const [retaking, setRetaking] = useState(false);

  if (!loaded || !auth) return <div className="learn" />;

  // Older accounts predate the split card — offer the display name halved.
  const guessed = (auth.name ?? "").trim().split(/\s+/).filter(Boolean);
  const firstVal = first ?? (auth.first || guessed[0] || "");
  const lastVal = last ?? (auth.last || guessed.slice(1).join(" "));
  const phoneVal = phone ?? (auth.phone || "");
  const dobVal = dob ?? (auth.dob || "");
  const level = levelFor(state.xp);
  const totalDone = Object.values(state.done).reduce((a, b) => a + b.length, 0);

  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 4000);
  };

  const saveIdentity = async (e: FormEvent) => {
    e.preventDefault();
    const res = await apiUpdateProfile(auth.token, {
      first: firstVal.trim(),
      last: lastVal.trim(),
      phone: phoneVal.trim(),
      dob: dobVal,
    });
    if (res.ok) {
      lms.adoptAuthUser(res.data.user as Partial<Omit<AuthUser, "token">>);
      flash("Student ID updated — your certificate uses your full name.");
    } else {
      flash((res.data.error as string) ?? "Could not update the card.");
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    const res = await apiChangePassword(auth.token, pwCurrent, pwNext);
    if (res.ok) {
      flash("Password changed.");
      setPwCurrent("");
      setPwNext("");
    } else {
      flash((res.data.error as string) ?? "Could not change the password.");
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ account: auth.email, exported: new Date().toISOString(), progress: state }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "self-made-school-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Last 30 local days of activity for the bars.
  const bars = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const p = (n: number) => String(n).padStart(2, "0");
    return state.activity.includes(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
  });

  // Quiz average across attempted knowledge checks.
  const quizEntries = Object.entries(state.quizBest);
  const quizAvg =
    quizEntries.length > 0
      ? Math.round((quizEntries.reduce((a, [, v]) => a + v, 0) / (quizEntries.length * 4)) * 100)
      : null;

  return (
    <div className="learn">
      <RewardToast reward={lms.reward} onDone={lms.clearReward} />
      <div className="learn-wrap">
        <Link href="/learn" className="crumb">
          ← My Learning
        </Link>

        <div className="lms-profile-hero">
          {state.avatar.created ? (
            <span className="lms-portrait-big" aria-hidden="true">
              <Portrait
                avatar={state.avatar}
                equipped={state.equipped}
                size={92}
                aura={auraFor(state.equipped, state.xp).tier}
              />
            </span>
          ) : (
            <span className="lms-avatar lms-avatar--big" aria-hidden="true">
              {(auth.name || auth.email).slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <p className="kicker kicker--acc">Student File</p>
            <h1 className="learn-h1 lms-profile-h1">{auth.name}</h1>
            <p className="lms-profile-meta">
              {auth.email} · {level.name} · {state.xp} XP
              {auth.role === "admin" && " · Faculty"}
            </p>
          </div>
        </div>

        {msg && (
          <p className="lms-admin-flash" role="status">
            {msg}
          </p>
        )}

        <section className="lms-section">
          <h2 className="lms-section-h">Insights</h2>
          <p className="lms-section-sub">Your last 30 days, and how each part of the course is holding.</p>
          <div className="lms-insights">
            <div className="lms-insight-card">
              <p className="lms-insight-label">Activity — last 30 days</p>
              <div className="lms-bars" role="img" aria-label={`Active ${bars.filter(Boolean).length} of the last 30 days`}>
                {bars.map((on, i) => (
                  <span key={i} className={`lms-bar${on ? " is-on" : ""}`} />
                ))}
              </div>
              <p className="lms-insight-foot">
                {bars.filter(Boolean).length} active days · {state.streak.count}-day streak
              </p>
            </div>
            <div className="lms-insight-card">
              <p className="lms-insight-label">Knowledge checks</p>
              <p className="lms-insight-big">{quizAvg === null ? "—" : `${quizAvg}%`}</p>
              <p className="lms-insight-foot">
                {quizEntries.length === 0
                  ? "No checks taken yet"
                  : `average across ${quizEntries.length} check${quizEntries.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <div className="lms-insight-card">
              <p className="lms-insight-label">Badges</p>
              <p className="lms-insight-big">
                {state.badges.length}/{BADGES.length}
              </p>
              <p className="lms-insight-foot">{totalDone} units complete</p>
            </div>
          </div>
          <div className="lms-mastery">
            {COURSES.map((course) => {
              const p = courseProgress(state, course.slug);
              return (
                <Link key={course.slug} href={`/learn/${course.slug}`} className="lms-mastery-item">
                  <Ring pct={p.pct} tone={course.tone} />
                  <span className="lms-mastery-name">{course.title}</span>
                  <span className="lms-mastery-count">
                    {p.done}/{p.total}
                    {state.finals[course.slug]?.passed && " · Honors"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="lms-section lms-gate">
          <h2 className="lms-section-h">Identity</h2>
          <p className="lms-section-sub">
            Your Student ID. The full name appears on your certificate; the phone
            number is for the front office only — never public.
          </p>
          <form className="lms-admin-form" onSubmit={saveIdentity}>
            <div className="lms-form-row">
              <div>
                <label className="lms-login-label" htmlFor="pf-first">
                  First Name
                </label>
                <input
                  id="pf-first"
                  className="lms-cert-name"
                  value={firstVal}
                  maxLength={40}
                  required
                  autoComplete="given-name"
                  onChange={(e) => setFirst(e.target.value)}
                />
              </div>
              <div>
                <label className="lms-login-label" htmlFor="pf-last">
                  Last Name
                </label>
                <input
                  id="pf-last"
                  className="lms-cert-name"
                  value={lastVal}
                  maxLength={40}
                  required
                  autoComplete="family-name"
                  onChange={(e) => setLast(e.target.value)}
                />
              </div>
            </div>
            <label className="lms-login-label">Email</label>
            <input className="lms-cert-name" value={auth.email} disabled aria-label="Email (fixed)" />
            <div className="lms-form-row">
              <div>
                <label className="lms-login-label" htmlFor="pf-phone">
                  Telephone
                </label>
                <input
                  id="pf-phone"
                  className="lms-cert-name"
                  type="tel"
                  value={phoneVal}
                  maxLength={24}
                  required
                  autoComplete="tel"
                  placeholder="+1 555 010 2030"
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="lms-login-label" htmlFor="pf-dob">
                  Birthday
                </label>
                <input
                  id="pf-dob"
                  className="lms-cert-name"
                  type="date"
                  value={dobVal}
                  required
                  autoComplete="bday"
                  min="1900-01-01"
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
            </div>
            <button className="btn btn--solid lms-login-btn" type="submit">
              Save Student ID
            </button>
          </form>
        </section>

        <section className="lms-section">
          <h2 className="lms-section-h">Appearance</h2>
          <p className="lms-section-sub">
            Your portrait, and how class looks on every device you sign into.
          </p>
          <div className="lms-portrait-edit">
            <Portrait avatar={state.avatar} equipped={state.equipped} size={84} />
            <div className="lms-portrait-actions">
              <button className="lms-signout" onClick={() => setRetaking((r) => !r)}>
                {retaking
                  ? "Close Picture Day"
                  : state.avatar.created
                    ? "Retake Picture Day"
                    : "Take Your Picture"}
              </button>
              <Link href="/learn/locker" className="lms-signout">
                Gear &amp; Shop
              </Link>
            </div>
          </div>
          {retaking && (
            <AvatarStudio firstRun={!state.avatar.created} onDone={() => setRetaking(false)} />
          )}
          <div className="lms-themes">
            <button
              className={`lms-theme-swatch lms-theme-swatch--dark${state.theme === "dark" ? " is-active" : ""}`}
              onClick={() => lms.setTheme("dark")}
            >
              <span className="lms-theme-preview" />
              Night School
            </button>
            <button
              className={`lms-theme-swatch lms-theme-swatch--light${state.theme === "light" ? " is-active" : ""}`}
              onClick={() => lms.setTheme("light")}
            >
              <span className="lms-theme-preview" />
              Day Class
            </button>
          </div>
        </section>

        <section className="lms-section lms-gate">
          <h2 className="lms-section-h">Security</h2>
          <form className="lms-admin-form" onSubmit={changePassword}>
            <input
              className="lms-cert-name"
              type="password"
              placeholder="Current password"
              autoComplete="current-password"
              required
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
            />
            <input
              className="lms-cert-name"
              type="password"
              placeholder="New password (10+ characters)"
              autoComplete="new-password"
              required
              minLength={10}
              value={pwNext}
              onChange={(e) => setPwNext(e.target.value)}
            />
            <button className="btn btn--outline lms-login-btn" type="submit">
              Change Password
            </button>
          </form>
        </section>

        <section className="lms-section lms-gate">
          <h2 className="lms-section-h">Your data</h2>
          <p className="lms-section-sub">
            It&apos;s yours. Take a copy anytime, or wipe the slate and run the course again.
          </p>
          <div className="learn-ctas">
            <button className="btn btn--outline lms-login-btn" onClick={exportData}>
              Download My Data
            </button>
            <button
              className={`btn lms-login-btn ${resetArmed ? "btn--solid" : "btn--outline"}`}
              onClick={() => {
                if (!resetArmed) {
                  setResetArmed(true);
                  setTimeout(() => setResetArmed(false), 5000);
                } else {
                  lms.resetProgress();
                  setResetArmed(false);
                  flash("Progress reset. The 13th Grade is waiting — again.");
                }
              }}
            >
              {resetArmed ? "Click Again to Confirm Reset" : "Reset My Progress"}
            </button>
            <button className="btn btn--outline lms-login-btn" onClick={() => lms.logout()}>
              Sign Out
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
