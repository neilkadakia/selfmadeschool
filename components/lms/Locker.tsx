"use client";

// The Locker: your portrait, your gear, and the school store. Credits
// come from finished units, perfect checks, decks, and boss battles;
// gear changes your Arena numbers, so shopping is strategy.

import Link from "next/link";
import { useState } from "react";
import {
  GEAR,
  GEAR_SLOTS,
  attackFor,
  defenseFor,
  type Gear,
} from "@/lib/game";
import { useLms } from "@/components/useLms";
import AvatarStudio from "./AvatarStudio";
import Portrait from "./Portrait";
import RewardToast from "./RewardToast";

function GearCard({ item }: { item: Gear }) {
  const lms = useLms();
  const owned = lms.state.gear.includes(item.id);
  const equipped = lms.state.equipped[item.slot] === item.id;
  const affordable = lms.state.credits >= item.price;

  return (
    <div className={`lms-gear${owned ? " is-owned" : ""}${equipped ? " is-equipped" : ""}`}>
      <div className="lms-gear-head">
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
            {equipped ? "Equipped ✓ — Take Off" : "Equip"}
          </button>
        ) : (
          <button
            className={`btn ${affordable ? "btn--solid" : "btn--outline"} lms-gear-buy`}
            disabled={!affordable}
            onClick={() => lms.buyGear(item.id)}
          >
            {affordable ? `Buy — ${item.price} Cr` : `${item.price} Cr`}
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

  return (
    <div className="learn">
      <RewardToast reward={lms.reward} onDone={lms.clearReward} />
      <div className="learn-wrap">
        <Link href="/learn" className="crumb">
          ← My Learning
        </Link>
        <p className="kicker kicker--acc">The Locker</p>
        <h1 className="learn-h1">Suit up.</h1>
        <p className="learn-sub">
          Credits come from doing the work — units, perfect knowledge checks, flashcard decks,
          boss battles. Spend them here. Everything you equip counts in{" "}
          <Link href="/learn/arena">the Arena</Link>.
        </p>

        <div className="lms-locker-top">
          <div className="lms-locker-me">
            <Portrait avatar={state.avatar} equipped={state.equipped} size={150} />
            <div className="lms-locker-stats">
              <span className="lms-locker-credit">
                {state.credits} <em>Credits</em>
              </span>
              <span className="lms-locker-stat">⚔ Attack {attackFor(state.equipped)}</span>
              <span className="lms-locker-stat">⛨ Defense {defenseFor(state.equipped)}</span>
              <button className="lms-signout" onClick={() => setRetaking((r) => !r)}>
                {retaking ? "Close Picture Day" : "Retake Picture Day"}
              </button>
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
          win pays 60.
        </p>
      </div>
    </div>
  );
}
