"use client";

// The Locker: your build, your gear, and the school store. Credits come
// from doing the work; gear raises your Power; Power draws itself on the
// portrait as an aura. You're not dressing a character. You're building
// yourself, and the build should LOOK like something.

import Link from "next/link";
import { useState } from "react";
import {
  AURA_TIERS,
  GEAR,
  GEAR_SLOTS,
  attackFor,
  auraFor,
  defenseFor,
  type Gear,
} from "@/lib/game";
import { useLms } from "@/components/useLms";
import AvatarStudio from "./AvatarStudio";
import Portrait, { GearIcon } from "./Portrait";
import RewardToast from "./RewardToast";

function GearCard({ item }: { item: Gear }) {
  const lms = useLms();
  const owned = lms.state.gear.includes(item.id);
  const equipped = lms.state.equipped[item.slot] === item.id;
  const affordable = lms.state.credits >= item.price;

  return (
    <div className={`lms-gear${owned ? " is-owned" : ""}${equipped ? " is-equipped" : ""}`}>
      <div className="lms-gear-head">
        <span className="lms-gear-icon">
          <GearIcon id={item.id} slot={item.slot} />
        </span>
        <span className="lms-gear-name">{item.name}</span>
        <span className="lms-gear-stat">{item.atk > 0 ? `+${item.atk} ATK` : `+${item.def} DEF`}</span>
      </div>
      <p className="lms-gear-blurb">{item.blurb}</p>
      <div className="lms-gear-foot">
        {owned ? (
          <button
            className="lms-signout"
            onClick={() => lms.setEquipped(item.slot, equipped ? null : item.id)}
          >
            {equipped ? "Equipped ✓ · Take Off" : "Equip"}
          </button>
        ) : (
          <button
            className={`btn ${affordable ? "btn--solid" : "btn--outline"} lms-gear-buy`}
            disabled={!affordable}
            onClick={() => lms.buyGear(item.id)}
          >
            {affordable ? `Buy · ${item.price} Cr` : `Need ${item.price} Cr`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Locker() {
  const lms = useLms();
  const { state } = lms;
  const [retaking, setRetaking] = useState(false);

  const aura = auraFor(state.equipped, state.xp);
  const maxPower = AURA_TIERS[AURA_TIERS.length - 1].at;
  const powerPct = Math.min(100, Math.round((aura.power / maxPower) * 100));

  return (
    <div className="learn">
      <RewardToast reward={lms.reward} onDone={lms.clearReward} />
      <div className="learn-wrap">
        <Link href="/learn" className="crumb">
          ← My Learning
        </Link>
        <p className="kicker kicker--acc">The Locker</p>
        <h1 className="learn-h1">Build yourself.</h1>
        <p className="learn-sub">
          Credits come from doing the work: units, perfect knowledge checks, decks, boss
          battles. Spend them on gear, and watch the portrait change: your Power grows with
          what you carry <em>and</em> what you&apos;ve learned, and past a point it starts to
          show. Everything you equip counts in <Link href="/learn/arena">the Arena</Link>.
        </p>

        <div className="lms-locker-top">
          <div className="lms-locker-me">
            <div className={`lms-locker-portrait${aura.tier >= 3 ? " is-radiant" : ""}`}>
              <Portrait avatar={state.avatar} equipped={state.equipped} size={150} aura={aura.tier} />
            </div>
            <div className="lms-locker-stats">
              <span className="lms-locker-credit">
                {state.credits} <em>Credits</em>
              </span>
              <span className="lms-locker-stat">⚔ Attack {attackFor(state.equipped, state.xp)}</span>
              <span className="lms-locker-stat">⛨ Defense {defenseFor(state.equipped)}</span>
              <button className="lms-signout" onClick={() => setRetaking((r) => !r)}>
                {retaking ? "Close Picture Day" : "Retake Picture Day"}
              </button>
            </div>
            <div className="lms-power">
              <div className="lms-power-head">
                <span className="lms-power-label">Power</span>
                <span className="lms-power-num">{aura.power}</span>
                <span
                  className="lms-power-tier"
                  style={aura.color ? { color: aura.color, borderColor: aura.color } : undefined}
                >
                  {aura.name}
                </span>
              </div>
              <span className="lms-power-track">
                {AURA_TIERS.slice(1).map((t) => (
                  <span
                    key={t.at}
                    className="lms-power-notch"
                    style={{ left: `${(t.at / maxPower) * 100}%` }}
                  />
                ))}
                <span
                  className="lms-power-fill"
                  style={{
                    width: `${powerPct}%`,
                    background: aura.color ?? "rgba(242,238,227,0.35)",
                  }}
                />
              </span>
              <p className="lms-power-foot">
                {aura.next
                  ? `${aura.next.needs} more Power to go ${aura.next.name}. Gear up, level up, or both.`
                  : "Maximum aura. The portrait can't get any louder."}
              </p>
            </div>
          </div>
          {retaking && <AvatarStudio onDone={() => setRetaking(false)} />}
        </div>

        {GEAR_SLOTS.map(({ slot, label }) => (
          <section key={slot} className="lms-section" aria-label={label}>
            <h2 className="lms-section-h">{label}</h2>
            <div className="lms-gear-grid">
              {GEAR.filter((g) => g.slot === slot).map((item) => (
                <GearCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}

        <p className="lms-hint">
          Short on Credits? Every finished unit pays 20, a perfect check pays 10, and a first boss
          win pays 60. Grade levels add attack all by themselves. Wisdom is a weapon here.
        </p>
      </div>
    </div>
  );
}
