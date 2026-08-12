"use client";

import { useEffect, useState } from "react";

const KEY = "sms-progress-v1";

// Course progress, stored locally — no account needed to learn.
export function useProgress() {
  const [done, setDone] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setDone(JSON.parse(raw));
    } catch {
      // Private mode or blocked storage — progress just won't persist.
    }
    setLoaded(true);
  }, []);

  const toggle = (slug: string) => {
    setDone((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return { done, toggle, loaded };
}
