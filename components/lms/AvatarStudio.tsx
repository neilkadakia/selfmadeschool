"use client";

// Picture Day: build your student portrait. Used full-screen on first
// sign-in (dashboard swaps to it until saved) and inside the Locker
// for retakes.

import { useState } from "react";
import {
  BODY_TYPES,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFIT_COLORS,
  SKIN_TONES,
  type AvatarConfig,
} from "@/lib/game";
import { useLms } from "@/components/useLms";
import Portrait from "./Portrait";

export default function AvatarStudio({
  firstRun = false,
  onDone,
}: {
  firstRun?: boolean;
  onDone?: () => void;
}) {
  const lms = useLms();
  const a = lms.state.avatar;
  const [draft, setDraft] = useState<AvatarConfig>({
    body: a.body,
    skin: a.skin,
    hair: a.hair,
    hairColor: a.hairColor,
    outfit: a.outfit,
  });

  const set = (patch: Partial<AvatarConfig>) => setDraft((d) => ({ ...d, ...patch }));

  const save = () => {
    lms.saveAvatar(draft);
    onDone?.();
  };

  return (
    <div className="lms-studio">
      <div className="lms-studio-stage">
        <Portrait avatar={draft} equipped={lms.state.equipped} size={170} />
        <span className="lms-studio-frame" aria-hidden="true" />
      </div>
      <div className="lms-studio-panel">
        <div className="lms-studio-row">
          <span className="lms-studio-label">Body</span>
          <div className="lms-studio-opts">
            {BODY_TYPES.map((label, i) => (
              <button
                key={label}
                className={`lms-studio-chip${draft.body === i ? " is-on" : ""}`}
                onClick={() => set({ body: i })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="lms-studio-row">
          <span className="lms-studio-label">Skin</span>
          <div className="lms-studio-opts">
            {SKIN_TONES.map((t, i) => (
              <button
                key={t.name}
                className={`lms-studio-swatch${draft.skin === i ? " is-on" : ""}`}
                style={{ background: t.color }}
                title={t.name}
                aria-label={`Skin: ${t.name}`}
                onClick={() => set({ skin: i })}
              />
            ))}
          </div>
        </div>
        <div className="lms-studio-row">
          <span className="lms-studio-label">Hair</span>
          <div className="lms-studio-opts">
            {HAIR_STYLES.map((label, i) => (
              <button
                key={label}
                className={`lms-studio-chip${draft.hair === i ? " is-on" : ""}`}
                onClick={() => set({ hair: i })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="lms-studio-row">
          <span className="lms-studio-label">Hair Color</span>
          <div className="lms-studio-opts">
            {HAIR_COLORS.map((t, i) => (
              <button
                key={t.name}
                className={`lms-studio-swatch${draft.hairColor === i ? " is-on" : ""}`}
                style={{ background: t.color }}
                title={t.name}
                aria-label={`Hair color: ${t.name}`}
                onClick={() => set({ hairColor: i })}
              />
            ))}
          </div>
        </div>
        <div className="lms-studio-row">
          <span className="lms-studio-label">Outfit</span>
          <div className="lms-studio-opts">
            {OUTFIT_COLORS.map((t, i) => (
              <button
                key={t.name}
                className={`lms-studio-swatch${draft.outfit === i ? " is-on" : ""}`}
                style={{ background: t.color }}
                title={t.name}
                aria-label={`Outfit: ${t.name}`}
                onClick={() => set({ outfit: i })}
              />
            ))}
          </div>
        </div>
        <button className="btn btn--solid lms-login-btn" onClick={save}>
          {firstRun ? "Take the Picture →" : "Save the Retake"}
        </button>
        {firstRun && (
          <p className="lms-studio-note">
            You can retake Picture Day anytime in the Locker. Saving also pays out Credits for
            every unit you&apos;ve already finished — shopping money.
          </p>
        )}
      </div>
    </div>
  );
}
