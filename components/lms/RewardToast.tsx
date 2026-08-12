"use client";

// Bottom-corner toast for XP gains and new badges, with a small confetti burst.
// Entry animation is pure CSS; the effect only fires confetti and schedules dismissal.
// Respects prefers-reduced-motion (no confetti, toast still shows).

import { useEffect, useRef } from "react";
import type { Reward } from "@/components/useLms";

const CONFETTI_COLORS = ["#43DE7B", "#5B7CFA", "#FFB43A", "#F2EEE3", "#FF9DE2"];

function burst(host: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < 26; i++) {
    const piece = document.createElement("span");
    piece.className = "lms-confetti";
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const angle = Math.random() * Math.PI - Math.PI; // upward half
    const distance = 60 + Math.random() * 140;
    piece.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--dy", `${Math.sin(angle) * distance - 40}px`);
    piece.style.setProperty("--rot", `${Math.random() * 540 - 270}deg`);
    piece.style.animationDelay = `${Math.random() * 120}ms`;
    host.appendChild(piece);
    setTimeout(() => piece.remove(), 1400);
  }
}

export default function RewardToast({
  reward,
  onDone,
}: {
  reward: Reward | null;
  onDone: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reward) return;
    if (hostRef.current) burst(hostRef.current);
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [reward, onDone]);

  if (!reward) return null;

  return (
    <div ref={hostRef} className="lms-toast" role="status">
      {reward.xp > 0 && <span className="lms-toast-xp">+{reward.xp} XP</span>}
      {reward.badges.map((b) => (
        <span key={b.id} className="lms-toast-badge">
          <span className="lms-badge-icon">{b.icon}</span> {b.name}
        </span>
      ))}
    </div>
  );
}
