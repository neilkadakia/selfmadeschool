"use client";

// Shared furniture for the Faculty Lounge. Small, unopinionated pieces:
// the rooms decide what to say, these decide how it sits on the page.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ROLE_RANK, rankOf } from "@/lib/api";
import { useLms } from "@/components/useLms";

// ---------- the room ----------

export function Room({
  kicker,
  title,
  sub,
  actions,
  children,
}: {
  kicker: string;
  title: string;
  sub?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="fac">
      <div className="fac-wrap">
        <header className="fac-head">
          <div>
            <p className="fac-kicker">{kicker}</p>
            <h1 className="fac-h1">{title}</h1>
            {sub && <p className="fac-sub">{sub}</p>}
          </div>
          {actions && <div className="fac-head-actions">{actions}</div>}
        </header>
        {children}
      </div>
    </div>
  );
}

// Anything under /learn/faculty is staff only. The server enforces every
// call independently; this is just so a student who wanders in gets a
// sentence instead of a wall of failed requests.
export function FacultyOnly({ min = ROLE_RANK.educator, children }: { min?: number; children: ReactNode }) {
  const lms = useLms();
  if (!lms.loaded) {
    return (
      <div className="fac">
        <div className="fac-wrap">
          <Skeleton rows={5} />
        </div>
      </div>
    );
  }
  if (rankOf(lms.auth?.role) < min) {
    return (
      <Room
        kicker="Faculty Lounge"
        title="Staff only."
        sub="This room is for people who run the school. Your class is right back there."
      >
        <Link href="/learn" className="fac-btn fac-btn--go">
          Back to Class
        </Link>
      </Room>
    );
  }
  return <>{children}</>;
}

// ---------- panels ----------

export function Panel({
  title,
  count,
  countTone = "warn",
  sub,
  actions,
  flush,
  children,
}: {
  title: string;
  count?: number;
  countTone?: "warn" | "quiet";
  sub?: ReactNode;
  actions?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="fac-panel">
      <div className="fac-panel-head">
        <div>
          <h2 className="fac-panel-h">
            {title}
            {count !== undefined && count > 0 && (
              <span className={`fac-count${countTone === "quiet" ? " fac-count--quiet" : ""}`}>{count}</span>
            )}
          </h2>
          {sub && <p className="fac-panel-sub">{sub}</p>}
        </div>
        {actions && <div className="fac-head-actions">{actions}</div>}
      </div>
      <div className={`fac-panel-body${flush ? " fac-panel-body--flush" : ""}`}>{children}</div>
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <p className="fac-empty">
      <strong>{title}</strong>
      {children}
    </p>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="fac-skel" style={{ width: `${100 - i * 9}%` }} />
      ))}
    </div>
  );
}

// ---------- stats ----------

export function Stat({
  n,
  label,
  note,
  tone,
}: {
  n: number | string;
  label: string;
  note?: string;
  tone?: "acc" | "warn";
}) {
  return (
    <div className={`fac-stat${tone ? ` fac-stat--${tone}` : ""}`}>
      <span className="fac-stat-n">{n}</span>
      <span className="fac-stat-l">{label}</span>
      {note && <span className="fac-stat-note">{note}</span>}
    </div>
  );
}

export function Pulse({ children }: { children: ReactNode }) {
  return <div className="fac-pulse">{children}</div>;
}

// ---------- controls ----------

export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; count?: number }[];
}) {
  return (
    <div className="fac-tabs" role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          className={`fac-tab${value === o.id ? " is-on" : ""}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
          {o.count !== undefined && ` (${o.count})`}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  on,
  onChange,
  label,
  disabled,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className={`fac-toggle${on ? " is-on" : ""}`}
      onClick={() => onChange(!on)}
    />
  );
}

export function Tag({ tone, children }: { tone?: "acc" | "vio" | "coral" | "pink"; children: ReactNode }) {
  return <span className={`fac-tag${tone ? ` fac-tag--${tone}` : ""}`}>{children}</span>;
}

export function Meter({ pct, tone = "acc" }: { pct: number; tone?: string }) {
  return (
    <div className="fac-meter" role="img" aria-label={`${pct}% complete`}>
      <div className={`fac-meter-fill tone-${tone}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

// ---------- charts ----------
//
// Both of these draw only what they were given. Neither invents a baseline,
// smooths a curve, or starts an axis anywhere but zero.

export function Bars({
  rows,
  max,
}: {
  rows: { label: string; value: number; note?: string; tone?: string }[];
  max?: number;
}) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="fac-bars">
      {rows.map((r, i) => (
        <div key={i} className="fac-bar-row">
          <span className="fac-bar-label">
            <span className="fac-bar-name">{r.label}</span>
            {r.note && <span className="fac-dimmer" style={{ fontSize: 12 }}>{r.note}</span>}
          </span>
          <span className="fac-num fac-muted" style={{ textAlign: "right" }}>
            {r.value}
          </span>
          <span className="fac-bar-track">
            <span
              className="fac-bar-fill"
              style={{
                width: `${(r.value / top) * 100}%`,
                background: r.tone ? `var(--${r.tone})` : undefined,
              }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

// A plain column chart. Days with nobody in them are drawn as empty, not
// skipped, so a quiet week looks quiet instead of disappearing.
export function Columns({
  rows,
  height = 90,
  label,
}: {
  rows: { label: string; value: number }[];
  height?: number;
  label: string;
}) {
  const top = Math.max(1, ...rows.map((r) => r.value));
  const w = 100 / Math.max(1, rows.length);
  return (
    <svg
      className="fac-chart"
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      style={{ height }}
      role="img"
      aria-label={label}
    >
      {rows.map((r, i) => {
        const h = (r.value / top) * (height - 6);
        return (
          <rect
            key={i}
            x={i * w + w * 0.18}
            y={height - h}
            width={w * 0.64}
            height={Math.max(r.value > 0 ? 1.5 : 0.6, h)}
            rx={0.8}
            fill={r.value > 0 ? "var(--acc)" : "rgba(242,238,227,0.13)"}
          >
            <title>{`${r.label}: ${r.value}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

// ---------- the flash ----------

export function useFlash() {
  const [msg, setMsg] = useState("");
  const flash = useCallback((text: string) => setMsg(text), []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 4600);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? (
    <p className="fac-flash" role="status">
      {msg}
    </p>
  ) : null;
  return { flash, node };
}

// ---------- data loading ----------
//
// One hook for every room: hold the token, run the call, keep the result,
// and expose a reload the room can call after it changes something.

export function useFacultyData<T>(
  load: (token: string) => Promise<{ ok: boolean; data: Record<string, unknown> }>,
  deps: unknown[] = []
) {
  const lms = useLms();
  const token = lms.auth?.token ?? "";
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!token) return;
    let live = true;
    void load(token).then((r) => {
      if (!live) return;
      if (r.ok) {
        setData(r.data as T);
        setError("");
      } else {
        setError((r.data.error as string) ?? "Could not load that.");
      }
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tick, ...deps]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, error, reload, token, lms };
}

// ---------- formatting ----------

export function initials(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

// The sort helper every table here uses: click once for descending (the
// interesting end of a number is almost always the top), again to flip.
export function useSort<K extends string>(initial: K, initialDesc = true) {
  const [key, setKey] = useState<K>(initial);
  const [desc, setDesc] = useState(initialDesc);
  const toggle = useCallback(
    (k: K) => {
      if (k === key) setDesc((d) => !d);
      else {
        setKey(k);
        setDesc(true);
      }
    },
    [key]
  );
  const header = useCallback(
    (k: K, label: string) => (
      <button className={`fac-sort${key === k ? " is-on" : ""}`} onClick={() => toggle(k)}>
        {label}
        {key === k && <span aria-hidden="true">{desc ? "↓" : "↑"}</span>}
      </button>
    ),
    [key, desc, toggle]
  );
  return { key, desc, toggle, header };
}

export function useSorted<T>(rows: T[], key: keyof T, desc: boolean): T[] {
  return useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (typeof av === "number" && typeof bv === "number") return desc ? bv - av : av - bv;
      const as = String(av ?? "");
      const bs = String(bv ?? "");
      return desc ? bs.localeCompare(as) : as.localeCompare(bs);
    });
    return out;
  }, [rows, key, desc]);
}
