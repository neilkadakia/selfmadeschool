"use client";

// The After-School Arena. Every completed part unlocks its boss; the
// fight is the part's own quiz questions wearing a monster costume.
// Right answer → you lunge and land a hit. Wrong answer → it hits you.
// Chain right answers into combos; three in a row goes critical. Gear
// and grade level from the Locker move every number.

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { getCourse, COURSES } from "@/lib/lms";
import {
  BATTLE,
  CREDITS,
  allBosses,
  attackFor,
  auraFor,
  defenseFor,
  monsterFor,
  partKey,
  partQuestions,
} from "@/lib/game";
import { seedFrom, shuffled } from "@/lib/shuffle";
import { useLms } from "@/components/useLms";
import CommandK from "./CommandK";
import MonsterArt from "./MonsterArt";
import Portrait from "./Portrait";
import RewardToast from "./RewardToast";

// Combo math: every consecutive hit before this one adds +2 damage
// (capped), and the third hit in a row upgrades to a critical.
const COMBO_BONUS_CAP = 6;
const comboBonus = (combo: number) => Math.min(COMBO_BONUS_CAP, combo * 2);
const isCrit = (combo: number) => combo >= 2;

type Hit = { target: "you" | "boss"; amount: number; crit: boolean };

function ArenaIndex() {
  const lms = useLms();
  const { state } = lms;
  // Faculty carry a hall pass to every fight — for demos and quality checks.
  const isAdmin = lms.auth?.role === "admin";

  return (
    <div className="learn">
      <CommandK />
      <RewardToast reward={lms.reward} onDone={lms.clearReward} />
      <div className="learn-wrap">
        <Link href="/learn" className="crumb">
          ← My Learning
        </Link>
        <p className="kicker kicker--coral">The After-School Arena</p>
        <h1 className="learn-h1">Something guards every section.</h1>
        <p className="learn-sub">
          Finish all the units in a part and its boss steps out. The fight runs on that part&apos;s
          knowledge checks — right answers land hits, three in a row goes critical, wrong ones
          hurt. Gear up in <Link href="/learn/locker">the Locker</Link> first.
        </p>

        <div className="lms-boss-grid">
          {allBosses().map(({ course, part, partIndex, monster, key }) => {
            const done = state.done[course.slug] ?? [];
            const partDone = part.units.filter((u) => done.includes(u.slug)).length;
            const total = part.units.length;
            const unlocked = partDone === total && total > 0;
            const canFight = unlocked || isAdmin;
            const won = state.battles[key]?.won;
            const card = (
              <>
                <div
                  className={`lms-boss-art${canFight ? "" : " is-locked"}${won ? " is-beaten" : ""}`}
                >
                  <MonsterArt monster={monster} size={110} hurt={Boolean(won)} />
                </div>
                <div className="lms-boss-main">
                  <span className="lms-boss-name">{monster.name}</span>
                  <span className="lms-boss-sub">
                    {course.title} · {part.name}
                  </span>
                  <span className="lms-boss-sub lms-boss-statline">
                    {BATTLE.monsterHp(partIndex)} HP · hits for {BATTLE.monsterAtk(partIndex)}
                  </span>
                  <span
                    className={
                      won
                        ? "pill pill--acc"
                        : unlocked
                          ? "pill row-pill--coral"
                          : canFight
                            ? "pill row-pill--vio"
                            : "pill row-pill--dim"
                    }
                  >
                    {won
                      ? "Defeated ✓ — Rematch"
                      : unlocked
                        ? "Ready to Fight"
                        : canFight
                          ? `Faculty Pass — ${partDone}/${total} units`
                          : `Locked — ${partDone}/${total} units`}
                  </span>
                </div>
              </>
            );
            return canFight ? (
              <Link
                key={key}
                href={`/learn/arena/?course=${course.slug}&part=${partIndex}`}
                className="lms-boss is-open"
              >
                {card}
              </Link>
            ) : (
              <div key={key} className="lms-boss">
                {card}
              </div>
            );
          })}
        </div>

        <p className="lms-hint">
          First win on a boss: +{BATTLE.xpFirstWin} XP, +{CREDITS.battleFirstWin} Credits, and the
          Monster Slayer badge. Losing costs nothing but pride.
        </p>
      </div>
    </div>
  );
}

function Battle({ courseSlug, partIndex }: { courseSlug: string; partIndex: number }) {
  const lms = useLms();
  const { state } = lms;
  const course = getCourse(courseSlug);
  const part = course?.parts[partIndex];

  const key = partKey(courseSlug, partIndex);
  const monster = course ? monsterFor(course, partIndex) : null;
  const maxMonsterHp = BATTLE.monsterHp(partIndex);
  const monsterAtk = BATTLE.monsterAtk(partIndex);
  const myAtk = attackFor(state.equipped, state.xp);
  const myDef = defenseFor(state.equipped);
  const aura = auraFor(state.equipped, state.xp);
  const hitTaken = Math.max(BATTLE.minDamage, monsterAtk - myDef);

  const [phase, setPhase] = useState<"intro" | "fight" | "won" | "lost">("intro");
  const [seed, setSeed] = useState(() => seedFrom(`${key}:start`));
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [playerHp, setPlayerHp] = useState<number>(BATTLE.playerHp);
  const [monsterHp, setMonsterHp] = useState<number>(maxMonsterHp);
  const [combo, setCombo] = useState(0);
  const [lastHit, setLastHit] = useState<Hit | null>(null);
  const [firstWin, setFirstWin] = useState(false);

  if (!course || !part || !monster) {
    return (
      <div className="learn">
        <div className="learn-wrap lms-gate">
          <p className="kicker kicker--coral">The Arena</p>
          <h1 className="learn-h1">No monster here.</h1>
          <Link href="/learn/arena" className="btn btn--solid">
            Back to the Arena →
          </Link>
        </div>
      </div>
    );
  }

  const done = state.done[course.slug] ?? [];
  // Faculty hall pass: admins can demo any boss without finishing the part.
  const unlocked =
    lms.auth?.role === "admin" || part.units.every((u) => done.includes(u.slug));
  const questions = shuffled(partQuestions(course, part), seed);
  const round = questions.length > 0 ? questions[qi % questions.length] : null;
  const q = round?.question ?? null;

  const begin = () => {
    setSeed(seedFrom(`${key}:${state.battles[key]?.attempts ?? 0}`));
    setQi(0);
    setPicked(null);
    setPlayerHp(BATTLE.playerHp);
    setMonsterHp(maxMonsterHp);
    setCombo(0);
    setLastHit(null);
    setPhase("fight");
  };

  const answer = (oi: number) => {
    if (picked !== null || !q || !round) return;
    setPicked(oi);
    // Battle misses feed the make-up pile too — Study Hall picks them up.
    lms.questionResult(round.key, oi === q.answer);
    if (oi === q.answer) {
      const dmg = myAtk + comboBonus(combo);
      setLastHit({ target: "boss", amount: dmg, crit: isCrit(combo) });
      setCombo((c) => c + 1);
      setMonsterHp((hp) => Math.max(0, hp - dmg));
    } else {
      setLastHit({ target: "you", amount: hitTaken, crit: false });
      setCombo(0);
      setPlayerHp((hp) => Math.max(0, hp - hitTaken));
    }
  };

  // answer() already applied the damage, so the HP values here are current.
  const advance = () => {
    if (picked === null) return;
    if (monsterHp <= 0) {
      setFirstWin(!state.battles[key]?.won);
      setPhase("won");
      lms.battleResult(key, true);
      return;
    }
    if (playerHp <= 0) {
      setPhase("lost");
      lms.battleResult(key, false);
      return;
    }
    setQi((i) => i + 1);
    setPicked(null);
  };

  if (!unlocked && phase === "intro") {
    return (
      <div className="learn">
        <div className="learn-wrap lms-gate">
          <p className="kicker kicker--coral">The Arena</p>
          <h1 className="learn-h1">{monster.name} isn&apos;t out yet.</h1>
          <p className="learn-sub">
            Finish every unit in {part.name} and it steps into the ring.
          </p>
          <Link href={`/learn/${course.slug}`} className="btn btn--solid">
            Back to the Course →
          </Link>
        </div>
      </div>
    );
  }

  const struck = picked !== null && lastHit !== null;
  const bossStruck = struck && lastHit.target === "boss";
  const youStruck = struck && lastHit.target === "you";
  const firstName = state.name ? state.name.split(" ")[0] : "You";

  return (
    <div className="learn">
      <RewardToast reward={lms.reward} onDone={lms.clearReward} />
      <div className="learn-wrap lms-arena-wrap">
        <Link href="/learn/arena" className="crumb">
          ← The Arena
        </Link>

        {phase === "intro" && (
          <div className="lms-vs">
            <div className="lms-vs-side lms-vs-side--you">
              <Portrait avatar={state.avatar} equipped={state.equipped} size={120} aura={aura.tier} />
              <span className="lms-vs-name">{state.name || "You"}</span>
              {aura.color && (
                <span className="lms-vs-tier" style={{ color: aura.color }}>
                  {aura.name}
                </span>
              )}
              <span className="lms-vs-stats">
                ⚔ {myAtk} · ⛨ {myDef} · {BATTLE.playerHp} HP
              </span>
            </div>
            <span className="lms-vs-mark" aria-hidden="true">
              VS
            </span>
            <div className="lms-vs-side lms-vs-side--boss">
              <span className="lms-idle">
                <MonsterArt monster={monster} size={130} />
              </span>
              <span className="lms-vs-name">{monster.name}</span>
              <span className="lms-vs-stats">
                ⚔ {monsterAtk} · {maxMonsterHp} HP
              </span>
            </div>
          </div>
        )}

        {phase === "intro" && (
          <div className="lms-arena-intro">
            <p className="lms-arena-taunt">{monster.taunt}</p>
            <p className="lms-arena-weak">Weakness: {monster.weakness}</p>
            {questions.length > 0 ? (
              <div className="demo-close-ctas">
                <button className="btn btn--solid" onClick={begin}>
                  Ring the Bell →
                </button>
                <Link href="/learn/locker" className="btn btn--outline">
                  Gear Up First
                </Link>
              </div>
            ) : (
              <p className="lms-section-sub">
                This section&apos;s knowledge checks aren&apos;t written yet — the boss is on a
                lunch break.
              </p>
            )}
          </div>
        )}

        {phase === "fight" && q && (
          <>
            <div className="lms-stage">
              <div className="lms-fighter">
                <div className="lms-hp">
                  <span className="lms-hp-head">
                    <span>{firstName}</span>
                    <em>
                      {playerHp}/{BATTLE.playerHp}
                    </em>
                  </span>
                  <span className="lms-hp-track">
                    <span
                      className={`lms-hp-fill lms-hp-fill--you${
                        playerHp <= BATTLE.playerHp * 0.3 ? " is-low" : ""
                      }`}
                      style={{ width: `${(playerHp / BATTLE.playerHp) * 100}%` }}
                    />
                  </span>
                </div>
                <div
                  className={`lms-fighter-art${bossStruck ? " is-attacking" : ""}${
                    youStruck ? " is-hit" : ""
                  }${playerHp <= 0 ? " is-ko" : ""}`}
                >
                  <Portrait
                    avatar={state.avatar}
                    equipped={state.equipped}
                    size={110}
                    aura={aura.tier}
                  />
                  {youStruck && (
                    <span key={`d${qi}`} className="lms-dmg lms-dmg--you" aria-hidden="true">
                      −{lastHit.amount}
                    </span>
                  )}
                </div>
              </div>

              <div className="lms-stage-mid" aria-live="polite">
                {combo >= 2 && (
                  <span key={`c${combo}`} className="lms-combo">
                    Combo ×{combo}
                  </span>
                )}
                {bossStruck && lastHit.crit && (
                  <span key={`k${qi}`} className="lms-crit" aria-hidden="true">
                    CRITICAL!
                  </span>
                )}
              </div>

              <div className="lms-fighter">
                <div className="lms-hp">
                  <span className="lms-hp-head">
                    <span>{monster.name}</span>
                    <em>
                      {monsterHp}/{maxMonsterHp}
                    </em>
                  </span>
                  <span className="lms-hp-track">
                    <span
                      className="lms-hp-fill lms-hp-fill--boss"
                      style={{
                        width: `${(monsterHp / maxMonsterHp) * 100}%`,
                        background: monster.color,
                      }}
                    />
                  </span>
                </div>
                <div
                  className={`lms-fighter-art lms-fighter-art--boss${
                    youStruck ? " is-attacking" : ""
                  }${bossStruck ? ` is-hit${lastHit.crit ? " is-crit" : ""}` : ""}${
                    monsterHp <= 0 ? " is-defeated" : " lms-idle"
                  }`}
                >
                  <MonsterArt monster={monster} size={118} hurt={monsterHp === 0} />
                  {bossStruck && (
                    <span
                      key={`d${qi}`}
                      className={`lms-dmg lms-dmg--boss${lastHit.crit ? " lms-dmg--crit" : ""}`}
                      aria-hidden="true"
                    >
                      −{lastHit.amount}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div
              key={`${qi}-${picked === null ? "ask" : "hit"}`}
              className={`lms-quiz lms-arena-quiz${
                picked === null ? "" : picked === q.answer ? " arena-hit-boss" : " arena-hit-you"
              }`}
            >
              <div className="lms-quiz-head">
                <span className="lms-quiz-progress">Round {qi + 1}</span>
                <span className="lms-quiz-best">
                  Hit for {myAtk + comboBonus(combo)}
                  {isCrit(combo) ? " — CRITICAL up" : combo > 0 ? ` (combo +${comboBonus(combo)})` : ""} ·
                  it hits for {hitTaken}
                </span>
              </div>
              <p className="lms-quiz-q">{q.q}</p>
              <div className="lms-quiz-options">
                {q.options.map((opt, oi) => {
                  const isPicked = picked === oi;
                  const isAnswer = q.answer === oi;
                  let cls = "lms-quiz-opt";
                  if (picked !== null && isAnswer) cls += " is-right";
                  else if (isPicked && !isAnswer) cls += " is-wrong";
                  return (
                    <button key={oi} className={cls} disabled={picked !== null} onClick={() => answer(oi)}>
                      <span className="lms-quiz-letter">{String.fromCharCode(65 + oi)}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {picked !== null && lastHit && (
                <div className={`lms-quiz-explain${picked === q.answer ? " is-right" : ""}`}>
                  <strong>
                    {picked === q.answer
                      ? lastHit.crit
                        ? `CRITICAL — ${lastHit.amount} damage!`
                        : `Clean hit — ${lastHit.amount} damage.`
                      : `It got you for ${lastHit.amount}.`}
                  </strong>{" "}
                  {q.explain}
                </div>
              )}
              {picked !== null && (
                <button className="btn btn--solid lms-quiz-btn" onClick={advance}>
                  {picked === q.answer && monsterHp <= 0
                    ? "Finish It →"
                    : picked !== q.answer && playerHp <= 0
                      ? "…That Was the Last of Your HP"
                      : "Next Round →"}
                </button>
              )}
            </div>
          </>
        )}

        {phase === "won" && (
          <div className="lms-arena-end">
            <div className="lms-arena-scene">
              <span className="lms-victor">
                <Portrait avatar={state.avatar} equipped={state.equipped} size={130} aura={aura.tier} />
              </span>
              <span className="lms-fallen">
                <MonsterArt monster={monster} size={140} hurt />
              </span>
            </div>
            <p className="kicker kicker--acc">Victory</p>
            <h2 className="learn-h1 lms-arena-end-h">{monster.name} is toast.</h2>
            <p className="learn-sub">
              {firstWin
                ? `+${BATTLE.xpFirstWin} XP, +${CREDITS.battleFirstWin} Credits. The section is officially yours.`
                : `Rematch won — +${BATTLE.xpRematchWin} XP for keeping sharp.`}
            </p>
            <div className="demo-close-ctas">
              <Link href="/learn/arena" className="btn btn--solid">
                Back to the Arena →
              </Link>
              <Link href="/learn/locker" className="btn btn--outline">
                Spend the Credits
              </Link>
            </div>
          </div>
        )}

        {phase === "lost" && (
          <div className="lms-arena-end">
            <div className="lms-arena-scene">
              <span className="lms-ko-you">
                <Portrait avatar={state.avatar} equipped={state.equipped} size={110} aura={0} />
              </span>
              <span className="lms-gloat">
                <MonsterArt monster={monster} size={150} />
              </span>
            </div>
            <p className="kicker kicker--coral">Knocked Out</p>
            <h2 className="learn-h1 lms-arena-end-h">Walk it off.</h2>
            <p className="learn-sub">
              No XP lost, nothing broken — the questions are the same material, so a quick reread
              of the weak spots is the real power-up. Better gear from the Locker doesn&apos;t hurt
              either.
            </p>
            <div className="demo-close-ctas">
              <button className="btn btn--solid" onClick={begin}>
                Rematch →
              </button>
              <Link href={`/learn/${course.slug}`} className="btn btn--outline">
                Reread the Units
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Arena() {
  const params = useSearchParams();
  const courseSlug = params.get("course");
  const partParam = params.get("part");

  if (courseSlug && partParam !== null && COURSES.some((c) => c.slug === courseSlug)) {
    return <Battle courseSlug={courseSlug} partIndex={Number(partParam) || 0} />;
  }
  return <ArenaIndex />;
}
