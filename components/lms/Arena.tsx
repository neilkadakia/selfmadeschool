"use client";

// The After-School Arena. Every completed part unlocks its boss; the
// fight is the part's own quiz questions wearing a monster costume.
// Right answer → you lunge and land a hit. Wrong answer → it hits you.
// Chain right answers into combos; three in a row goes critical. Gear
// and grade level from the Locker move every number. Beat all three
// 13th Grade bosses and The Slammer, the hallway locker itself, steps
// off the wall for one last fight over the whole course.

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { getCourse, COURSES } from "@/lib/lms";
import {
  BATTLE,
  CREDITS,
  GEAR,
  SLAMMER,
  allBosses,
  attackFor,
  attackWith,
  auraFor,
  courseQuestions,
  defenseFor,
  monsterFor,
  partKey,
  partQuestions,
  slammerKey,
  slammerUnlocked,
} from "@/lib/game";
import { seedFrom, shuffled } from "@/lib/shuffle";
import { isFaculty } from "@/lib/api";
import { useLms } from "@/components/useLms";
import CommandK from "./CommandK";
import LockerBossArt from "./LockerBossArt";
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
  // Faculty carry a hall pass to every fight, for demos and quality checks.
  const isAdmin = isFaculty(lms.auth?.role);

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
          knowledge checks: right answers land hits, three in a row goes critical, wrong ones
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
                      ? "Defeated ✓ · Rematch"
                      : unlocked
                        ? "Ready to Fight"
                        : canFight
                          ? `Faculty Pass · ${partDone}/${total} units`
                          : `Locked · ${partDone}/${total} units`}
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
          <SlammerCard
            battles={state.battles}
            isAdmin={isAdmin}
          />
        </div>

        <p className="lms-hint">
          First win on a boss: +{BATTLE.xpFirstWin} XP, +{CREDITS.battleFirstWin} Credits, and the
          Monster Slayer badge. Losing costs nothing but pride.
        </p>
      </div>
    </div>
  );
}

// The hallway super-boss card. It sits in the same grid as the part
// bosses but only steps off the wall once all three of them are beaten.
function SlammerCard({
  battles,
  isAdmin,
}: {
  battles: Record<string, { won: boolean }>;
  isAdmin: boolean;
}) {
  const course = getCourse("the-13th-grade");
  if (!course) return null;
  const key = slammerKey(course.slug);
  const beatenParts = course.parts.filter((_, i) => battles[partKey(course.slug, i)]?.won).length;
  const total = course.parts.length;
  const unlocked = slammerUnlocked(course, battles);
  const canFight = unlocked || isAdmin;
  const won = battles[key]?.won;
  const card = (
    <>
      <div className={`lms-boss-art${canFight ? "" : " is-locked"}${won ? " is-beaten" : ""}`}>
        <LockerBossArt size={110} beaten={Boolean(won)} />
      </div>
      <div className="lms-boss-main">
        <span className="lms-boss-name">{SLAMMER.name}</span>
        <span className="lms-boss-sub">{course.title} · The Hallway</span>
        <span className="lms-boss-sub lms-boss-statline">
          {SLAMMER.hp} HP · slams for {SLAMMER.atk}
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
            ? "Defeated ✓ · Rematch"
            : unlocked
              ? "Ready to Fight"
              : canFight
                ? `Faculty Pass · ${beatenParts}/${total} bosses`
                : `Locked · ${beatenParts}/${total} bosses`}
        </span>
      </div>
    </>
  );
  return canFight ? (
    <Link href="/learn/arena/?boss=slammer" className="lms-boss is-open">
      {card}
    </Link>
  ) : (
    <div className="lms-boss">{card}</div>
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
  // Faculty hall pass: educators and up can demo any boss unfinished.
  const unlocked =
    isFaculty(lms.auth?.role) || part.units.every((u) => done.includes(u.slug));
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
    // Battle misses feed the make-up pile too. Study Hall picks them up.
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
                This section&apos;s knowledge checks aren&apos;t written yet. The boss is on a
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
                  {isCrit(combo) ? ", CRITICAL up" : combo > 0 ? ` (combo +${comboBonus(combo)})` : ""} ·
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
                        ? `CRITICAL: ${lastHit.amount} damage!`
                        : `Clean hit: ${lastHit.amount} damage.`
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
                : `Rematch won. +${BATTLE.xpRematchWin} XP for keeping sharp.`}
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
              No XP lost, nothing broken. The questions are the same material, so a quick reread
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

// The Slammer's fight. Differences from a part boss: the player picks a
// weapon at the door instead of using whatever is equipped, the question
// set is fixed at SLAMMER.rounds pulled from the whole course, a CORRECT
// answer (and only a correct answer) dents the door, and running out of
// questions before the door gives is a loss all its own.
function SlammerBattle() {
  const lms = useLms();
  const { state } = lms;
  const course = getCourse("the-13th-grade");
  const key = slammerKey("the-13th-grade");

  const myDef = defenseFor(state.equipped);
  const aura = auraFor(state.equipped, state.xp);
  const hitTaken = Math.max(BATTLE.minDamage, SLAMMER.atk - myDef);
  const ownedWeapons = GEAR.filter((g) => g.slot === "weapon" && state.gear.includes(g.id));

  // undefined = not chosen yet, so the equipped weapon can arrive with the
  // synced state and still land as the default; null = bare hands.
  const [weapon, setWeapon] = useState<string | null | undefined>(undefined);
  const chosen = weapon === undefined ? (state.equipped.weapon ?? null) : weapon;
  const myAtk = attackWith(chosen, state.xp);

  const [phase, setPhase] = useState<"intro" | "fight" | "won" | "lost">("intro");
  const [lostBy, setLostBy] = useState<"ko" | "bell">("ko");
  const [seed, setSeed] = useState(() => seedFrom(`${key}:start`));
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [playerHp, setPlayerHp] = useState<number>(BATTLE.playerHp);
  const [lockerHp, setLockerHp] = useState<number>(SLAMMER.hp);
  const [dents, setDents] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastHit, setLastHit] = useState<Hit | null>(null);
  const [firstWin, setFirstWin] = useState(false);

  if (!course) {
    return (
      <div className="learn">
        <div className="learn-wrap lms-gate">
          <p className="kicker kicker--coral">The Arena</p>
          <h1 className="learn-h1">No locker here.</h1>
          <Link href="/learn/arena" className="btn btn--solid">
            Back to the Arena →
          </Link>
        </div>
      </div>
    );
  }

  const unlocked = isFaculty(lms.auth?.role) || slammerUnlocked(course, state.battles);
  const questions = shuffled(courseQuestions(course), seed).slice(0, SLAMMER.rounds);
  const round = questions.length > 0 ? questions[qi % questions.length] : null;
  const q = round?.question ?? null;
  const lastRound = qi + 1 >= questions.length;

  const begin = () => {
    setSeed(seedFrom(`${key}:${state.battles[key]?.attempts ?? 0}`));
    setQi(0);
    setPicked(null);
    setPlayerHp(BATTLE.playerHp);
    setLockerHp(SLAMMER.hp);
    setDents(0);
    setCombo(0);
    setLastHit(null);
    setPhase("fight");
  };

  const answer = (oi: number) => {
    if (picked !== null || !q || !round) return;
    setPicked(oi);
    // Battle misses feed the make-up pile too. Study Hall picks them up.
    lms.questionResult(round.key, oi === q.answer);
    if (oi === q.answer) {
      // Right answer: the door takes a dent. This is the only way it does.
      const dmg = myAtk + comboBonus(combo);
      setLastHit({ target: "boss", amount: dmg, crit: isCrit(combo) });
      setCombo((c) => c + 1);
      setDents((d) => d + 1);
      setLockerHp((hp) => Math.max(0, hp - dmg));
    } else {
      // Wrong answer: the door slams you. The locker never takes a dent here.
      setLastHit({ target: "you", amount: hitTaken, crit: false });
      setCombo(0);
      setPlayerHp((hp) => Math.max(0, hp - hitTaken));
    }
  };

  // answer() already applied the damage, so the HP values here are current.
  const advance = () => {
    if (picked === null) return;
    if (lockerHp <= 0) {
      setFirstWin(!state.battles[key]?.won);
      setPhase("won");
      lms.battleResult(key, true);
      return;
    }
    if (playerHp <= 0) {
      setLostBy("ko");
      setPhase("lost");
      lms.battleResult(key, false);
      return;
    }
    if (lastRound) {
      // The set is spent and the door still stands. That is the bell.
      setLostBy("bell");
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
          <h1 className="learn-h1">{SLAMMER.name} isn&apos;t off the wall yet.</h1>
          <p className="learn-sub">
            Beat all three section bosses of {course.title} and the hallway locker itself steps
            out for one last fight.
          </p>
          <Link href="/learn/arena" className="btn btn--solid">
            Back to the Arena →
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
                <LockerBossArt size={130} />
              </span>
              <span className="lms-vs-name">{SLAMMER.name}</span>
              <span className="lms-vs-stats">
                ⚔ {SLAMMER.atk} · {SLAMMER.hp} HP
              </span>
            </div>
          </div>
        )}

        {phase === "intro" && (
          <div className="lms-arena-intro">
            <p className="lms-arena-taunt">{SLAMMER.taunt}</p>
            <p className="lms-arena-weak">Weakness: {SLAMMER.weakness}</p>
            <p className="lms-arena-weak">
              {questions.length} questions from anywhere in the course. Break it before the set
              runs out, or before it flattens you.
            </p>
            <p className="lms-weapon-head">Pick Your Weapon</p>
            <div className="lms-weapon-pick">
              <button
                className={`lms-weapon${chosen === null ? " is-picked" : ""}`}
                aria-pressed={chosen === null}
                onClick={() => setWeapon(null)}
              >
                <span className="lms-weapon-name">Bare Hands</span>
                <span className="lms-weapon-atk">Dents for {attackWith(null, state.xp)}</span>
              </button>
              {ownedWeapons.map((g) => (
                <button
                  key={g.id}
                  className={`lms-weapon${chosen === g.id ? " is-picked" : ""}`}
                  aria-pressed={chosen === g.id}
                  onClick={() => setWeapon(g.id)}
                >
                  <span className="lms-weapon-name">{g.name}</span>
                  <span className="lms-weapon-atk">Dents for {attackWith(g.id, state.xp)}</span>
                </button>
              ))}
            </div>
            {questions.length > 0 ? (
              <div className="demo-close-ctas">
                <button className="btn btn--solid" onClick={begin}>
                  Ring the Bell →
                </button>
                <Link href="/learn/locker" className="btn btn--outline">
                  Buy a Better Weapon
                </Link>
              </div>
            ) : (
              <p className="lms-section-sub">
                This course&apos;s knowledge checks aren&apos;t written yet. The locker is on a
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
                    <span>{SLAMMER.name}</span>
                    <em>
                      {lockerHp}/{SLAMMER.hp}
                    </em>
                  </span>
                  <span className="lms-hp-track">
                    <span
                      className="lms-hp-fill lms-hp-fill--boss"
                      style={{
                        width: `${(lockerHp / SLAMMER.hp) * 100}%`,
                        background: SLAMMER.color,
                      }}
                    />
                  </span>
                </div>
                <div
                  className={`lms-fighter-art lms-fighter-art--boss${
                    youStruck ? " is-attacking" : ""
                  }${bossStruck ? ` is-hit${lastHit.crit ? " is-crit" : ""}` : ""}${
                    lockerHp <= 0 ? " is-defeated" : " lms-idle"
                  }`}
                >
                  <LockerBossArt
                    size={118}
                    dents={dents}
                    slam={youStruck}
                    beaten={lockerHp === 0}
                  />
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
                <span className="lms-quiz-progress">
                  Question {qi + 1}/{questions.length}
                </span>
                <span className="lms-quiz-best">
                  Dent for {myAtk + comboBonus(combo)}
                  {isCrit(combo) ? ", CRITICAL up" : combo > 0 ? ` (combo +${comboBonus(combo)})` : ""} ·
                  it slams for {hitTaken}
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
                        ? `CRITICAL: ${lastHit.amount} into the door!`
                        : `Dented it for ${lastHit.amount}.`
                      : `The door got you for ${lastHit.amount}.`}
                  </strong>{" "}
                  {q.explain}
                </div>
              )}
              {picked !== null && (
                <button className="btn btn--solid lms-quiz-btn" onClick={advance}>
                  {picked === q.answer && lockerHp <= 0
                    ? "Rip the Door Off →"
                    : picked !== q.answer && playerHp <= 0
                      ? "…That Was the Last of Your HP"
                      : lastRound
                        ? "…And That's the Bell"
                        : "Next Question →"}
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
                <LockerBossArt size={140} beaten />
              </span>
            </div>
            <p className="kicker kicker--acc">Victory</p>
            <h2 className="learn-h1 lms-arena-end-h">{SLAMMER.name} is scrap metal.</h2>
            <p className="learn-sub">
              {firstWin
                ? `+${BATTLE.xpFirstWin} XP, +${CREDITS.battleFirstWin} Credits. The hallway is officially yours.`
                : `Rematch won. +${BATTLE.xpRematchWin} XP for keeping sharp.`}
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
                <LockerBossArt size={150} dents={dents} />
              </span>
            </div>
            <p className="kicker kicker--coral">{lostBy === "ko" ? "Slammed" : "Saved by the Bell"}</p>
            <h2 className="learn-h1 lms-arena-end-h">
              {lostBy === "ko" ? "The door won this one." : "It's still standing."}
            </h2>
            <p className="learn-sub">
              {lostBy === "ko"
                ? "No XP lost, nothing broken except your pride. Better armor blunts the slam, and every question you missed is already waiting in Study Hall."
                : `You landed ${dents} dent${dents === 1 ? "" : "s"} but the set ran out before the door gave. A heavier weapon dents deeper, and the rematch deals ${SLAMMER.rounds} fresh questions.`}
            </p>
            <div className="demo-close-ctas">
              <button className="btn btn--solid" onClick={begin}>
                Rematch →
              </button>
              <Link href="/learn/locker" className="btn btn--outline">
                Gear Up
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

  if (params.get("boss") === "slammer") {
    return <SlammerBattle />;
  }
  if (courseSlug && partParam !== null && COURSES.some((c) => c.slug === courseSlug)) {
    return <Battle courseSlug={courseSlug} partIndex={Number(partParam) || 0} />;
  }
  return <ArenaIndex />;
}
