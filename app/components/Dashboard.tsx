"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CoinTask, Screen, TaskKind } from "./types";

type Props = {
  calorieBalance: number;
  calorieTarget: number;
  caloriesEaten: number;
  fuelServiceDate: string;
  moneyBalance: number;
  debtBalance: number;
  debtFor: string;
  debtCount: number;
  todayMoneyEarned: number;
  buyableAllowance: number;
  buyableAvailable: number;
  charityAllowance: number;
  protectedMoney: number;
  spentThisMonth: number;
  tasksCompletedToday: number;
  xp: number;
  physicalTasks: CoinTask[];
  workTasks: CoinTask[];
  onNavigate: (screen: Screen, tab?: TaskKind) => void;
  onComplete: (task: CoinTask) => void;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export function Dashboard({
  calorieBalance,
  calorieTarget,
  caloriesEaten,
  fuelServiceDate,
  moneyBalance,
  debtBalance,
  debtFor,
  debtCount,
  todayMoneyEarned,
  buyableAllowance,
  buyableAvailable,
  charityAllowance,
  protectedMoney,
  spentThisMonth,
  tasksCompletedToday,
  xp,
  physicalTasks,
  workTasks,
  onNavigate,
  onComplete,
}: Props) {
  const [dateLabel] = useState(() => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date()));
  const physicalNext = physicalTasks.find((task) => !task.doneToday);
  const workNext = workTasks.find((task) => !task.doneToday);
  const calorieAvailable = calorieTarget;
  const progress = calorieAvailable > 0 ? Math.min((caloriesEaten / calorieAvailable) * 100, 100) : caloriesEaten > 0 ? 100 : 0;
  const localToday = (() => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; })();
  const fuelDateName = fuelServiceDate === localToday
    ? "Today"
    : new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(new Date(`${fuelServiceDate}T12:00:00`));
  const level = Math.min(100, Math.floor(xp / 100) + 1);
  const levelProgress = level === 100 ? 100 : xp % 100;
  const debtPercent = debtBalance > 0 ? Math.min((debtBalance / Math.max(moneyBalance, 1)) * 100, 100) : 0;
  const [dayIndex] = useState(() => Math.floor(Date.now() / 86_400_000));
  const advice = [
    {
      type: "Money mission",
      icon: "$",
      text: ["Ask two potential customers what problem costs them time or money before building a solution.", "Send one clear offer to five realistic buyers; count replies, not likes.", "Create a guaranteed payday saving rule before using leftover-money rules."][dayIndex % 3],
      source: "SBA / CFPB",
      url: dayIndex % 3 === 2 ? "https://www.consumerfinance.gov/data-research/research-reports/consumer-savings-app-strategies-and-savings-outcomes/" : "https://www.sba.gov/business-guide/plan-your-business/market-research-competitive-analysis",
    },
    {
      type: "Health tip",
      icon: "+",
      text: ["Protect a regular sleep window and aim for at least 7 hours if you are an adult.", "Break up long sitting periods with short movement breaks during your workday.", "Use today’s mood note to spot patterns, not to diagnose yourself."][dayIndex % 3],
      source: "CDC",
      url: dayIndex % 3 === 0 ? "https://www.cdc.gov/sleep/about/index.html" : "https://www.cdc.gov/physical-activity-basics/guidelines/adults.html",
    },
    {
      type: "Workout",
      icon: "▲",
      text: ["Build toward 150 minutes of moderate activity weekly, plus strength work on 2 days.", "Start below your maximum today; add time or resistance gradually and keep technique clean.", "A brisk 10-minute walk counts. Consistent movement is better than waiting for a perfect session."][dayIndex % 3],
      source: "CDC / HHS",
      url: "https://www.cdc.gov/physical-activity-basics/guidelines/adults.html",
    },
  ];

  return (
    <div className="screen dashboard-screen">
      <header className="page-heading dashboard-heading platform-hero">
        <div className="platform-hero-scene" aria-hidden="true">
          <span className="platform-cloud cloud-one" /><span className="platform-cloud cloud-two" />
          <span className="platform-hill hill-one" /><span className="platform-hill hill-two" />
          <span className="platform-pipe" /><span className="platform-block block-one">?</span><span className="platform-block block-two" />
          <span className="platform-coin coin-one" /><span className="platform-coin coin-two" /><span className="platform-coin coin-three" />
        </div>
        <div className="platform-hero-copy">
          <span className="eyebrow">Player 01 · {dateLabel}</span>
          <span className="platform-world-label">WORLD 01 · JOELIX KINGDOM</span>
          <h1>Ready?<br /><span>Play the day!</span></h1>
          <p>Move. Clear your Must Do quests. Earn money. Build a better life one level at a time.</p>
        </div>
        <button className="level-pill" onClick={() => onNavigate("player")} aria-label={`Level ${level}, ${xp} experience points`}><span>LVL {String(level).padStart(2, "0")}</span><strong>{xp.toLocaleString("en-US")} XP</strong><i><b style={{ width: `${levelProgress}%` }} /></i></button>
      </header>

      <MiniPlatformGame />

      <section className="balance-grid" aria-label="Joelix balances">
        <article className={`balance-card calorie-card ${calorieBalance < 0 ? "negative" : ""}`}>
          <div className="card-topline"><span className="coin-icon fire-icon">K</span><span>{fuelDateName}&apos;s intake</span></div>
          <p>Daily Calories</p>
          <strong>{caloriesEaten.toLocaleString("en-US")}</strong>
          <small>{calorieBalance < 0 ? `${Math.abs(calorieBalance).toLocaleString("en-US")} over the daily target` : `of ${calorieTarget.toLocaleString("en-US")} kcal consumed`}</small>
          <div className="card-rule" />
          <div className="card-metrics"><span><b>{caloriesEaten.toLocaleString("en-US")}</b> consumed</span><span><b>{calorieTarget.toLocaleString("en-US")}</b> target</span><span><b>{calorieBalance.toLocaleString("en-US")}</b> remaining</span></div>
        </article>

        <article className={`balance-card money-card ${debtBalance > 0 ? "debt-warning" : ""}`}>
          <div className="card-topline"><span className="coin-icon money-icon">$</span><span>{debtBalance > 0 ? `Debt alert · ${debtCount} open` : "Lifetime wallet"}</span></div>
          <p>Money Coin</p>
          <strong>{money(moneyBalance)}</strong>
          <small>{debtBalance > 0 ? `${money(debtBalance)} outstanding · Money Coin is not deducted` : "Your cumulative earnings"}</small>
          <div className="card-rule" />
          <div className="card-metrics"><span><b>+{money(todayMoneyEarned)}</b> today</span><span><b>{tasksCompletedToday}</b> tasks done</span></div>
          {debtBalance > 0 && <button type="button" className="money-debt-alert" onClick={() => onNavigate("store")}><span aria-hidden="true">!</span><b>{money(debtBalance)}</b> debt needs attention →</button>}
        </article>

        <article className="balance-card buyable-card">
          <div className="card-topline"><span className="coin-icon split-icon" aria-hidden="true" /><span>30% live allowance</span></div>
          <p>Buyable Coin</p>
          <strong>{money(buyableAvailable)}</strong>
          <small>Safe to spend right now</small>
          <div className="card-rule" />
          <div className="card-metrics"><span><b>{money(buyableAllowance)}</b> budget</span><span><b>{money(spentThisMonth)}</b> spent</span></div>
        </article>

        <article className="balance-card charity-card">
          <div className="card-topline"><span className="coin-icon charity-icon" aria-hidden="true">♥</span><span>10% live reserve</span></div>
          <p>Charity Coin</p>
          <strong>{money(charityAllowance)}</strong>
          <small>Reserved automatically to help others</small>
          <div className="card-rule" />
          <div className="card-metrics"><span><b>10%</b> charity</span><span><b>{money(protectedMoney)}</b> 60% protected</span></div>
        </article>
      </section>

      <section className={`debt-home-card ${debtBalance > 0 ? "has-debt" : "clear"}`} aria-label={`Debt balance ${money(debtBalance)}`}>
        <span className="debt-home-icon" aria-hidden="true">$−</span>
        <div className="debt-home-copy"><small>{debtBalance > 0 ? `${debtCount} outstanding ${debtCount === 1 ? "debt" : "debts"}` : "Debt balance"}</small><strong>{debtBalance > 0 ? debtFor.trim() || "Outstanding creditors" : "Debt-free status"}</strong><p>{debtBalance > 0 ? "Open the Store to pay each debt or mark it done without changing Money Coin." : "No debt has been added. Keep the balance at zero."}</p></div>
        <div className="debt-home-number"><small>Outstanding</small><strong>{money(debtBalance)}</strong><div><i style={{ width: `${debtPercent}%` }} /></div></div>
        <button type="button" onClick={() => onNavigate("store")}>{debtBalance > 0 ? "Record payment" : "Manage debt"} →</button>
      </section>

      <section className="quick-actions" aria-label="Quick actions">
        <button className="quick-action food" onClick={() => onNavigate("food")}><span>+</span><div><strong>Log food</strong><small>Add to daily intake</small></div><b>→</b></button>
        <button className="quick-action earn" onClick={() => onNavigate("tasks", "physical")}><span>✓</span><div><strong>Must Do quest</strong><small>Earn XP only</small></div><b>→</b></button>
        <button className="quick-action spend" onClick={() => onNavigate("store")}><span>−</span><div><strong>Spend buyable</strong><small>Log a purchase</small></div><b>→</b></button>
        <button className="quick-action stats" onClick={() => onNavigate("history")}><span>▥</span><div><strong>View stats</strong><small>Charts & streak</small></div><b>→</b></button>
      </section>

      <section className={`daily-progress calorie-cycle-progress card ${calorieBalance < 0 ? "warning" : ""}`}>
        <div className="section-title-row">
          <div><span className="eyebrow">Daily nutrition service · {fuelDateName}</span><h2>{calorieBalance < 0 ? "Daily intake is over target" : `${calorieTarget.toLocaleString("en-US")} kcal daily intake`}</h2></div>
          <button className="text-button" onClick={() => onNavigate("food")}>View log →</button>
        </div>
        <div className="progress-label"><span>{caloriesEaten.toLocaleString("en-US")} consumed</span><span>{calorieAvailable.toLocaleString("en-US")} available</span></div>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        <p>{calorieBalance < 0 ? `${Math.abs(calorieBalance)} calories over the target. Use the Fuel page to review meal portions.` : `${caloriesEaten.toLocaleString("en-US")} of ${calorieTarget.toLocaleString("en-US")} calories logged, with ${calorieBalance.toLocaleString("en-US")} remaining.`}</p>
      </section>

      <section className="next-up-section">
        <div className="section-title-row"><div><span className="eyebrow">World map · Next quests</span><h2>Choose your next move</h2></div><button className="text-button" onClick={() => onNavigate("tasks")}>Quest log →</button></div>
        <div className="next-grid">
          {physicalNext && <NextTask task={physicalNext} onComplete={onComplete} />}
          {workNext && <NextTask task={workNext} onComplete={onComplete} />}
        </div>
      </section>

      <section className="advice-section">
        <div className="section-title-row"><div><span className="eyebrow">Power-up house · Daily intel</span><h2>Power-ups for today</h2></div><button className="text-button" onClick={() => onNavigate("coach")}>Ask The Best →</button></div>
        <div className="advice-grid">{advice.map((item) => <article className="advice-card" key={item.type}><span>{item.icon}</span><div><small>{item.type}</small><p>{item.text}</p><a href={item.url} target="_blank" rel="noreferrer">{item.source} source ↗</a></div></article>)}</div>
        <p className="form-note">Health and workout cards are general education. Adjust for your age, condition, and clinician’s guidance.</p>
      </section>
    </div>
  );
}

type MiniGameMode = "ready" | "playing" | "paused" | "over" | "won";
type GameAbility = "speed" | "shield" | "jump" | "magnet";
type GameRect = { x: number; y: number; w: number; h: number };
type GameCoin = { x: number; y: number; collected: boolean };
type GameBlock = GameRect & { question: boolean; hit: boolean; ability?: GameAbility; secret?: boolean; broken?: boolean };
type GameEnemy = GameRect & { minX: number; maxX: number; speed: number; alive: boolean; behavior?: "patrol" | "chase" };
type GameParticle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
type GamePower = { x: number; y: number; collected: boolean; ability: GameAbility };
type GamePlayer = GameRect & { vx: number; vy: number; grounded: boolean; facing: 1 | -1; invulnerable: number; coyote: number; jumpBuffer: number; landSquash: number; power: number; ability: GameAbility | null; shield: number };
type MiniGameWorld = { ground: GameRect[]; platforms: GameRect[]; pipes: GameRect[]; blocks: GameBlock[]; coins: GameCoin[]; enemies: GameEnemy[]; hazards: GameRect[]; powers: GamePower[]; particles: GameParticle[] };

const GAME_WIDTH = 960;
const GAME_HEIGHT = 420;
const GAME_GROUND = 360;
const GAME_WORLD_WIDTH = 3_200;
const GAME_ABILITIES: Record<GameAbility, { label: string; short: string; detail: string; color: string; duration: number }> = {
  speed: { label: "Turbo", short: "T", detail: "Run faster", color: "#54e5ff", duration: 11 },
  shield: { label: "Shield", short: "S", detail: "Blocks one hit", color: "#8cff72", duration: 18 },
  jump: { label: "Super Jump", short: "J", detail: "Jump higher", color: "#ff78df", duration: 12 },
  magnet: { label: "Coin Magnet", short: "M", detail: "Pulls nearby coins", color: "#ffd326", duration: 13 },
};

function makeMiniGameWorld(): MiniGameWorld {
  return {
    ground: [
      { x: 0, y: GAME_GROUND, w: 760, h: 60 },
      { x: 880, y: GAME_GROUND, w: 605, h: 60 },
      { x: 1_645, y: GAME_GROUND, w: 715, h: 60 },
      { x: 2_490, y: GAME_GROUND, w: 710, h: 60 },
    ],
    platforms: [
      { x: 330, y: 280, w: 185, h: 22 }, { x: 1_015, y: 265, w: 170, h: 22 },
      { x: 1_305, y: 215, w: 145, h: 22 }, { x: 1_815, y: 275, w: 190, h: 22 },
      { x: 2_140, y: 225, w: 155, h: 22 }, { x: 2_645, y: 270, w: 205, h: 22 },
    ],
    pipes: [
      { x: 655, y: 302, w: 62, h: 58 }, { x: 1_430, y: 287, w: 68, h: 73 },
      { x: 2_240, y: 296, w: 64, h: 64 }, { x: 2_930, y: 280, w: 72, h: 80 },
    ],
    blocks: [
      { x: 250, y: 235, w: 42, h: 42, question: true, hit: false, ability: "speed" },
      { x: 292, y: 235, w: 42, h: 42, question: false, hit: false, secret: true },
      { x: 1_100, y: 178, w: 42, h: 42, question: true, hit: false, ability: "jump" },
      { x: 1_142, y: 178, w: 42, h: 42, question: false, hit: false, secret: true },
      { x: 1_184, y: 178, w: 42, h: 42, question: true, hit: false, ability: "shield" },
      { x: 2_010, y: 225, w: 42, h: 42, question: true, hit: false, ability: "magnet" },
      { x: 2_560, y: 185, w: 42, h: 42, question: true, hit: false, ability: "speed" },
    ],
    coins: [
      { x: 390, y: 235, collected: false }, { x: 445, y: 235, collected: false },
      { x: 810, y: 285, collected: false }, { x: 840, y: 255, collected: false }, { x: 870, y: 285, collected: false },
      { x: 1_055, y: 220, collected: false }, { x: 1_105, y: 220, collected: false },
      { x: 1_550, y: 270, collected: false }, { x: 1_585, y: 240, collected: false }, { x: 1_620, y: 270, collected: false },
      { x: 1_860, y: 228, collected: false }, { x: 1_920, y: 228, collected: false },
      { x: 2_175, y: 178, collected: false }, { x: 2_630, y: 220, collected: false }, { x: 2_690, y: 220, collected: false },
      { x: 3_040, y: 290, collected: false },
    ],
    enemies: [
      { x: 385, y: 252, w: 32, h: 28, minX: 345, maxX: 505, speed: 82, alive: true },
      { x: 525, y: 332, w: 32, h: 28, minX: 490, maxX: 640, speed: 78, alive: true },
      { x: 1_220, y: 332, w: 32, h: 28, minX: 1_190, maxX: 1_410, speed: -92, alive: true, behavior: "chase" },
      { x: 1_855, y: 247, w: 32, h: 28, minX: 1_820, maxX: 1_995, speed: 88, alive: true },
      { x: 1_940, y: 332, w: 32, h: 28, minX: 1_700, maxX: 2_180, speed: 96, alive: true },
      { x: 2_720, y: 332, w: 32, h: 28, minX: 2_520, maxX: 2_900, speed: -104, alive: true, behavior: "chase" },
      { x: 3_035, y: 332, w: 32, h: 28, minX: 2_970, maxX: 3_120, speed: 110, alive: true, behavior: "chase" },
    ],
    hazards: [
      { x: 600, y: 340, w: 38, h: 20 }, { x: 1_260, y: 340, w: 48, h: 20 },
      { x: 1_445, y: 340, w: 40, h: 20 }, { x: 1_705, y: 340, w: 48, h: 20 },
      { x: 2_065, y: 340, w: 48, h: 20 }, { x: 2_315, y: 340, w: 45, h: 20 },
      { x: 2_670, y: 340, w: 48, h: 20 }, { x: 2_840, y: 340, w: 48, h: 20 },
    ],
    powers: [{ x: 2_080, y: 185, collected: false, ability: "shield" }],
    particles: [],
  };
}

function gameRectsOverlap(a: GameRect, b: GameRect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function drawGameCoin(context: CanvasRenderingContext2D, x: number, y: number, spin: number) {
  const width = Math.max(5, Math.abs(Math.cos(spin)) * 17);
  const sparkle = Math.max(0, Math.sin(spin * .7));
  context.strokeStyle = `rgba(255,255,220,${sparkle})`; context.lineWidth = 2;
  context.beginPath(); context.moveTo(x - 16, y - 16); context.lineTo(x - 8, y - 16); context.moveTo(x - 12, y - 20); context.lineTo(x - 12, y - 12); context.stroke();
  context.fillStyle = "#7b4300";
  context.beginPath(); context.ellipse(x, y, width / 2 + 3, 15, 0, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#ffd326";
  context.beginPath(); context.ellipse(x, y, width / 2, 12, 0, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#fff2a1";
  context.fillRect(x - Math.max(1, width * .18), y - 7, Math.max(2, width * .16), 10);
  context.fillStyle = "#d68b00";
  context.fillRect(x + Math.max(1, width * .14), y - 7, Math.max(2, width * .14), 14);
}

function drawMiniGame(context: CanvasRenderingContext2D, world: MiniGameWorld, player: GamePlayer, camera: number, seconds: number, skin: "classic" | "gold" = "classic", shake = 0, characterImage: HTMLImageElement | null = null) {
  context.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  const sky = context.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  sky.addColorStop(0, "#45b8ff"); sky.addColorStop(1, "#bcecff");
  context.fillStyle = sky; context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  context.imageSmoothingEnabled = false;

  const backgroundOffset = (camera * .18) % 1_000;
  for (let index = -1; index < 3; index += 1) {
    const hillX = index * 500 - backgroundOffset;
    const hillGradient = context.createLinearGradient(hillX + 80, 220, hillX + 410, 360);
    hillGradient.addColorStop(0, "#73df6c"); hillGradient.addColorStop(1, "#24933e");
    context.fillStyle = hillGradient; context.strokeStyle = "#146a2c"; context.lineWidth = 5;
    context.beginPath(); context.ellipse(hillX + 250, 345, 190, 125, 0, Math.PI, Math.PI * 2); context.fill(); context.stroke();
    context.fillStyle = "#ffffff"; context.strokeStyle = "rgba(23,52,76,.55)"; context.lineWidth = 3;
    context.beginPath(); context.arc(hillX + 95, 82, 24, Math.PI, 0); context.arc(hillX + 125, 70, 31, Math.PI, 0); context.arc(hillX + 157, 83, 23, Math.PI, 0); context.lineTo(hillX + 180, 103); context.lineTo(hillX + 71, 103); context.closePath(); context.fill(); context.stroke();
  }

  const shakeX = shake ? Math.sin(seconds * 83) * shake : 0;
  const shakeY = shake ? Math.cos(seconds * 71) * shake * .65 : 0;
  context.save(); context.translate(-camera + shakeX, shakeY);
  world.ground.forEach((ground) => {
    context.fillStyle = "#a94e28"; context.fillRect(ground.x, ground.y, ground.w, ground.h);
    context.strokeStyle = "#152018"; context.lineWidth = 5; context.strokeRect(ground.x, ground.y, ground.w, ground.h);
    context.strokeStyle = "rgba(76,28,10,.55)"; context.lineWidth = 3;
    for (let x = ground.x + 36; x < ground.x + ground.w; x += 36) { context.beginPath(); context.moveTo(x, ground.y); context.lineTo(x, ground.y + ground.h); context.stroke(); }
    for (let y = ground.y + 24; y < ground.y + ground.h; y += 24) { context.beginPath(); context.moveTo(ground.x, y); context.lineTo(ground.x + ground.w, y); context.stroke(); }
  });

  const drawBrick = (solid: GameRect, color = "#bd5428") => {
    context.fillStyle = color; context.fillRect(solid.x, solid.y, solid.w, solid.h);
    context.strokeStyle = "#152018"; context.lineWidth = 4; context.strokeRect(solid.x, solid.y, solid.w, solid.h);
    context.strokeStyle = "rgba(86,29,8,.5)"; context.lineWidth = 2;
    for (let x = solid.x + 32; x < solid.x + solid.w; x += 32) { context.beginPath(); context.moveTo(x, solid.y); context.lineTo(x, solid.y + solid.h); context.stroke(); }
  };
  world.platforms.forEach((platform) => drawBrick(platform));
  world.blocks.forEach((block) => {
    if (block.broken) return;
    const blockGradient = block.question && !block.hit ? "#f5b82e" : block.question ? "#9b8050" : "#bd5428";
    drawBrick(block, blockGradient);
    if (block.question && !block.hit) {
      context.fillStyle = "rgba(255,255,255,.34)"; context.fillRect(block.x + 5, block.y + 5, block.w - 10, 5);
      context.fillStyle = "#7c4700"; [[6,6],[block.w-9,6],[6,block.h-9],[block.w-9,block.h-9]].forEach(([dx,dy]) => context.fillRect(block.x + dx, block.y + dy, 3, 3));
      context.fillStyle = "#fff"; context.font = "900 25px monospace"; context.textAlign = "center"; context.fillText("?", block.x + block.w / 2, block.y + 30);
    } else if (block.question && block.hit && block.ability) {
      const ability = GAME_ABILITIES[block.ability];
      context.fillStyle = ability.color; context.fillRect(block.x + 8, block.y + 8, block.w - 16, block.h - 16);
      context.fillStyle = "#111820"; context.font = "900 18px monospace"; context.textAlign = "center"; context.fillText(ability.short, block.x + block.w / 2, block.y + 28);
    }
  });

  world.pipes.forEach((pipe) => {
    const pipeGradient = context.createLinearGradient(pipe.x, 0, pipe.x + pipe.w, 0);
    pipeGradient.addColorStop(0,"#0d7629"); pipeGradient.addColorStop(.28,"#62ea72"); pipeGradient.addColorStop(.62,"#31b84d"); pipeGradient.addColorStop(1,"#096420");
    context.fillStyle = pipeGradient; context.fillRect(pipe.x, pipe.y, pipe.w, pipe.h);
    context.fillStyle = "rgba(255,255,255,.25)"; context.fillRect(pipe.x + 13, pipe.y + 4, 10, pipe.h - 8);
    context.strokeStyle = "#102017"; context.lineWidth = 5; context.strokeRect(pipe.x, pipe.y, pipe.w, pipe.h);
    context.fillStyle = pipeGradient; context.fillRect(pipe.x - 7, pipe.y, pipe.w + 14, 18); context.strokeRect(pipe.x - 7, pipe.y, pipe.w + 14, 18);
  });

  world.hazards.forEach((hazard) => {
    context.fillStyle = "#e43f35"; context.strokeStyle = "#681b17"; context.lineWidth = 3;
    const spikes = Math.max(1, Math.round(hazard.w / 18));
    for (let index = 0; index < spikes; index += 1) {
      const spikeWidth = hazard.w / spikes;
      context.beginPath(); context.moveTo(hazard.x + index * spikeWidth, hazard.y + hazard.h); context.lineTo(hazard.x + index * spikeWidth + spikeWidth / 2, hazard.y); context.lineTo(hazard.x + (index + 1) * spikeWidth, hazard.y + hazard.h); context.closePath(); context.fill(); context.stroke();
    }
  });

  world.powers.forEach((power) => {
    if (power.collected) return;
    const ability = GAME_ABILITIES[power.ability];
    context.save(); context.translate(power.x, power.y); context.rotate(Math.sin(seconds * 4) * .12);
    context.fillStyle = ability.color; context.strokeStyle = "#182116"; context.lineWidth = 3; context.beginPath();
    for (let point = 0; point < 10; point += 1) { const radius = point % 2 ? 7 : 16; const angle = -Math.PI / 2 + point * Math.PI / 5; const x = Math.cos(angle) * radius; const y = Math.sin(angle) * radius; if (!point) context.moveTo(x,y); else context.lineTo(x,y); }
    context.closePath(); context.fill(); context.stroke();
    context.fillStyle = "#111820"; context.font = "900 13px monospace"; context.textAlign = "center"; context.fillText(ability.short, 0, 5);
    context.restore();
  });

  world.coins.forEach((coin, index) => { if (!coin.collected) drawGameCoin(context, coin.x, coin.y, seconds * 6 + index * .5); });

  world.enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    context.fillStyle = enemy.behavior === "chase" ? "#d8562d" : "#4c326f"; context.strokeStyle = "#15101e"; context.lineWidth = 4;
    context.fillRect(enemy.x, enemy.y + 8, enemy.w, enemy.h - 8); context.strokeRect(enemy.x, enemy.y + 8, enemy.w, enemy.h - 8);
    context.beginPath(); context.arc(enemy.x + enemy.w / 2, enemy.y + 9, enemy.w / 2, Math.PI, 0); context.fill(); context.stroke();
    context.fillStyle = "#fff"; context.fillRect(enemy.x + 7, enemy.y + 12, 6, 7); context.fillRect(enemy.x + 20, enemy.y + 12, 6, 7);
    context.fillStyle = "#111"; context.fillRect(enemy.x + 10, enemy.y + 14, 3, 4); context.fillRect(enemy.x + 20, enemy.y + 14, 3, 4);
  });

  world.particles.forEach((particle) => {
    context.globalAlpha = Math.max(0, particle.life);
    context.fillStyle = particle.color; context.fillRect(particle.x, particle.y, particle.size, particle.size);
  });
  context.globalAlpha = 1;

  [900,1_660].forEach((checkpointX,index) => {
    context.fillStyle = "#e9eef0"; context.fillRect(checkpointX,305,5,55);
    context.fillStyle = index ? "#ffc928" : "#47c95b"; context.beginPath(); context.moveTo(checkpointX + 5,309); context.lineTo(checkpointX + 39,321); context.lineTo(checkpointX + 5,334); context.closePath(); context.fill();
  });

  const flagX = GAME_WORLD_WIDTH - 105;
  context.fillStyle = "#e8e8e8"; context.fillRect(flagX, 105, 7, 255);
  context.fillStyle = "#ffc928"; context.beginPath(); context.arc(flagX + 3, 100, 11, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#e53e31"; context.beginPath(); context.moveTo(flagX + 7, 125); context.lineTo(flagX + 77, 149); context.lineTo(flagX + 7, 175); context.closePath(); context.fill();
  context.fillStyle = "#fff"; context.font = "900 18px monospace"; context.textAlign = "center"; context.fillText("JX", flagX + 33, 153);

  const blink = player.invulnerable > 0 && Math.floor(seconds * 12) % 2 === 0;
  if (!blink) {
    context.save();
    const characterScale = 1.55;
    const squashX = characterScale * (1 + player.landSquash * .24);
    const squashY = characterScale * (1 - player.landSquash * .2);
    context.translate(player.x + player.w / 2, player.y + player.h); context.scale(squashX, squashY); context.translate(-(player.x + player.w / 2), -(player.y + player.h));
    if (player.facing === -1) { context.translate(player.x + player.w, 0); context.scale(-1, 1); context.translate(-player.x, 0); }
    if (player.power > 0 && player.ability) {
      context.strokeStyle = GAME_ABILITIES[player.ability].color;
      context.lineWidth = player.ability === "shield" ? 5 : 3;
      context.globalAlpha = .62 + Math.sin(seconds * 9) * .22;
      context.beginPath(); context.ellipse(player.x + 15, player.y + 21, 25, 30, 0, 0, Math.PI * 2); context.stroke();
      context.globalAlpha = 1;
    }
    if (characterImage?.complete && characterImage.naturalWidth) {
      context.save();
      context.imageSmoothingEnabled = true;
      context.filter = skin === "gold" ? "sepia(.28) saturate(1.2) brightness(1.08)" : "none";
      context.beginPath(); context.arc(player.x + 15, player.y + 20, 19, 0, Math.PI * 2); context.clip();
      context.drawImage(characterImage,1197,951,549,549,player.x - 4,player.y + 1,38,38);
      context.restore();
    }
    context.restore();
  }
  context.restore();
}

function MiniPlatformGame() {
  const [mode, setMode] = useState<MiniGameMode>("ready");
  const [hud, setHud] = useState<{ coins: number; score: number; lives: number; time: number; combo: number; power: number; ability: GameAbility | null }>({ coins: 0, score: 0, lives: 3, time: 140, combo: 0, power: 0, ability: null });
  const [abilityNotice, setAbilityNotice] = useState<{ id: number; ability: GameAbility; detail: string } | null>(null);
  const [muted, setMuted] = useState(false);
  const [bankedCoins, setBankedCoins] = useState(0);
  const [skin, setSkin] = useState<"classic" | "gold">("classic");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const characterImageRef = useRef<HTMLImageElement | null>(null);
  const gameRef = useRef<HTMLElement>(null);
  const modeRef = useRef<MiniGameMode>("ready");
  const worldRef = useRef<MiniGameWorld>(makeMiniGameWorld());
  const playerRef = useRef<GamePlayer>({ x: 70, y: 318, w: 30, h: 42, vx: 0, vy: 0, grounded: false, facing: 1, invulnerable: 0, coyote: 0, jumpBuffer: 0, landSquash: 0, power: 0, ability: null, shield: 0 });
  const inputRef = useRef({ left: false, right: false, down: false, jumpHeld: false, jumpQueued: false, jumpReleased: false });
  const coinsRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const timeRef = useRef(140);
  const checkpointRef = useRef(70);
  const comboRef = useRef(0);
  const comboTimerRef = useRef(0);
  const cameraRef = useRef(0);
  const shakeRef = useRef(0);
  const secretFoundRef = useRef(false);
  const bankedCoinsRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);

  const changeMode = (nextMode: MiniGameMode) => { modeRef.current = nextMode; setMode(nextMode); };
  const syncHud = () => setHud({ coins: coinsRef.current, score: scoreRef.current, lives: livesRef.current, time: Math.max(0, Math.ceil(timeRef.current)), combo: comboRef.current, power: Math.ceil(playerRef.current.power), ability: playerRef.current.ability });

  const playTone = useCallback((frequency: number, duration = .08, gainValue = .035, delay = 0) => {
    if (mutedRef.current) return;
    const AudioContextClass = window.AudioContext;
    const audio = audioRef.current ?? new AudioContextClass();
    audioRef.current = audio;
    if (audio.state === "suspended") void audio.resume();
    const oscillator = audio.createOscillator(); const gain = audio.createGain();
    oscillator.type = "square"; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(gainValue, audio.currentTime + delay); gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + delay + duration);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(audio.currentTime + delay); oscillator.stop(audio.currentTime + delay + duration);
  }, []);

  const playEffect = useCallback((effect: "start" | "jump" | "coin" | "stomp" | "hit" | "power" | "win") => {
    const sounds: Record<typeof effect, number[]> = { start:[392,523,659], jump:[330,494], coin:[988,1319], stomp:[185,147], hit:[110,82], power:[523,659,784,1047], win:[523,659,784,1047,1319] };
    sounds[effect].forEach((frequency,index) => playTone(frequency,effect === "win" ? .16 : .08,effect === "hit" ? .05 : .035,index * .055));
  }, [playTone]);

  const resetPlayer = () => {
    playerRef.current = { x: checkpointRef.current, y: 285, w: 30, h: 42, vx: 0, vy: 0, grounded: false, facing: 1, invulnerable: 1.5, coyote: 0, jumpBuffer: 0, landSquash: 0, power: 0, ability: null, shield: 0 };
  };

  const startGame = () => {
    worldRef.current = makeMiniGameWorld();
    coinsRef.current = 0; scoreRef.current = 0; livesRef.current = 3; timeRef.current = 140; checkpointRef.current = 70; comboRef.current = 0; comboTimerRef.current = 0; cameraRef.current = 0; shakeRef.current = 0; secretFoundRef.current = false;
    setAbilityNotice(null);
    resetPlayer();
    playerRef.current.invulnerable = 0;
    inputRef.current = { left: false, right: false, down: false, jumpHeld: false, jumpQueued: false, jumpReleased: false };
    syncHud();
    playEffect("start");
    changeMode("playing");
    window.requestAnimationFrame(() => gameRef.current?.focus());
  };

  const setControl = (control: "left" | "right" | "down" | "jump", pressed: boolean) => {
    if (control === "jump") {
      if (pressed && !inputRef.current.jumpHeld) inputRef.current.jumpQueued = true;
      if (!pressed && inputRef.current.jumpHeld) inputRef.current.jumpReleased = true;
      inputRef.current.jumpHeld = pressed;
      return;
    }
    inputRef.current[control] = pressed;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    drawMiniGame(context, worldRef.current, playerRef.current, 0, 0);
    const characterImage = new Image();
    characterImage.src = "/joelix-player-photo-v2.jpg";
    characterImage.onload = () => { characterImageRef.current = characterImage; drawMiniGame(context,worldRef.current,playerRef.current,0,0,"classic",0,characterImage); };
    return () => { characterImage.onload = null; };
  }, []);

  useEffect(() => {
    if (mode !== "playing") return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let animationFrame = 0;
    let lastTime = performance.now();
    let hudTimer = 0;
    let totalSeconds = 0;
    let musicStep = -1;

    const spawnParticles = (x: number, y: number, color: string, count = 8) => {
      for (let index = 0; index < count; index += 1) worldRef.current.particles.push({ x, y, vx: (Math.random() - .5) * 180, vy: -80 - Math.random() * 180, life: .55 + Math.random() * .35, color, size: 3 + Math.random() * 5 });
    };

    const awardCombo = (basePoints: number) => {
      comboRef.current = comboTimerRef.current > 0 ? Math.min(8, comboRef.current + 1) : 1;
      comboTimerRef.current = 2.4;
      scoreRef.current += basePoints * comboRef.current;
    };

    const grantAbility = (ability: GameAbility, x: number, y: number) => {
      const config = GAME_ABILITIES[ability];
      const player = playerRef.current;
      player.ability = ability;
      player.power = config.duration;
      player.shield = ability === "shield" ? 1 : 0;
      const id = Date.now();
      setAbilityNotice({ id, ability, detail: config.detail });
      window.setTimeout(() => setAbilityNotice((notice) => notice?.id === id ? null : notice), 1_800);
      awardCombo(500);
      spawnParticles(x, y, config.color, 22);
      shakeRef.current = 6;
      playEffect("power");
      syncHud();
    };

    const loseLife = () => {
      if (playerRef.current.invulnerable > 0) return;
      if (playerRef.current.shield > 0) {
        const id = Date.now();
        playerRef.current.shield = 0;
        playerRef.current.power = 0;
        playerRef.current.ability = null;
        playerRef.current.invulnerable = 1.4;
        setAbilityNotice({ id, ability: "shield", detail: "Hit blocked!" });
        window.setTimeout(() => setAbilityNotice((notice) => notice?.id === id ? null : notice), 1_400);
        playEffect("power"); shakeRef.current = 8; spawnParticles(playerRef.current.x + 15, playerRef.current.y + 18, GAME_ABILITIES.shield.color, 20); syncHud();
        return;
      }
      playEffect("hit"); shakeRef.current = 10; spawnParticles(playerRef.current.x + 15, playerRef.current.y + 18, "#ef493d", 13);
      livesRef.current -= 1;
      if (livesRef.current <= 0) {
        livesRef.current = 0; syncHud(); changeMode("over"); return;
      }
      resetPlayer(); syncHud();
    };

    const frame = (time: number) => {
      if (modeRef.current !== "playing") return;
      const delta = Math.min((time - lastTime) / 1000, .033);
      lastTime = time; totalSeconds += delta; hudTimer += delta; timeRef.current -= delta;
      const player = playerRef.current;
      const world = worldRef.current;
      if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - delta);
      if (player.power > 0) {
        player.power = Math.max(0, player.power - delta);
        if (player.power === 0) { player.ability = null; player.shield = 0; }
      }
      player.landSquash = Math.max(0, player.landSquash - delta * 4.8);
      comboTimerRef.current = Math.max(0, comboTimerRef.current - delta);
      if (!comboTimerRef.current && comboRef.current) comboRef.current = 0;
      shakeRef.current = Math.max(0, shakeRef.current - delta * 28);
      world.particles.forEach((particle) => { particle.x += particle.vx * delta; particle.y += particle.vy * delta; particle.vy += 520 * delta; particle.life -= delta; });
      world.particles = world.particles.filter((particle) => particle.life > 0);

      const nextMusicStep = Math.floor(totalSeconds / .34);
      if (nextMusicStep !== musicStep) { musicStep = nextMusicStep; const melody = [392,494,523,659,523,494,440,330]; playTone(melody[musicStep % melody.length],.065,.014); }

      const direction = Number(inputRef.current.right) - Number(inputRef.current.left);
      const hasSpeed = player.ability === "speed" && player.power > 0;
      if (direction) { player.vx += direction * (hasSpeed ? 1_500 : 1_100) * delta; player.facing = direction > 0 ? 1 : -1; }
      else player.vx *= Math.pow(.001, delta);
      const topSpeed = hasSpeed ? 345 : 245;
      player.vx = Math.max(-topSpeed, Math.min(topSpeed, player.vx));
      if (inputRef.current.jumpQueued) { player.jumpBuffer = .13; inputRef.current.jumpQueued = false; }
      player.jumpBuffer = Math.max(0, player.jumpBuffer - delta);
      player.coyote = player.grounded ? .11 : Math.max(0, player.coyote - delta);
      if (player.jumpBuffer > 0 && player.coyote > 0) { player.vy = player.ability === "jump" && player.power > 0 ? -680 : -555; player.grounded = false; player.coyote = 0; player.jumpBuffer = 0; playEffect("jump"); }
      if (inputRef.current.jumpReleased) { if (player.vy < -120) player.vy *= .48; inputRef.current.jumpReleased = false; }
      player.vy = Math.min(720, player.vy + 1_380 * delta);

      const solids: GameRect[] = [...world.ground, ...world.platforms, ...world.pipes, ...world.blocks.filter((block) => !block.broken)];
      const oldX = player.x;
      player.x = Math.max(0, Math.min(GAME_WORLD_WIDTH - player.w, player.x + player.vx * delta));
      solids.forEach((solid) => {
        if (!gameRectsOverlap(player, solid)) return;
        if (player.vx > 0 && oldX + player.w <= solid.x + 5) player.x = solid.x - player.w;
        else if (player.vx < 0 && oldX >= solid.x + solid.w - 5) player.x = solid.x + solid.w;
        player.vx = 0;
      });

      const oldY = player.y;
      const landingSpeed = player.vy;
      player.y += player.vy * delta;
      player.grounded = false;
      solids.forEach((solid) => {
        if (!gameRectsOverlap(player, solid)) return;
        if (player.vy >= 0 && oldY + player.h <= solid.y + 8) {
          player.y = solid.y - player.h; player.vy = 0; player.grounded = true;
          if (landingSpeed > 330) { player.landSquash = 1; spawnParticles(player.x + player.w / 2, player.y + player.h, "#fff1b0", 6); }
        } else if (player.vy < 0 && oldY >= solid.y + solid.h - 8) {
          player.y = solid.y + solid.h; player.vy = 0;
          const block = world.blocks.find((item) => item === solid);
          if (block?.question && !block.hit) {
            block.hit = true; coinsRef.current += 1; bankedCoinsRef.current += 1; setBankedCoins(bankedCoinsRef.current);
            if (block.ability) grantAbility(block.ability, block.x + block.w / 2, block.y);
            else { awardCombo(200); spawnParticles(block.x + block.w / 2, block.y, "#ffd326", 11); shakeRef.current = 4; playEffect("coin"); syncHud(); }
          }
          else if (block?.secret && !block.broken) { block.broken = true; coinsRef.current += 3; bankedCoinsRef.current += 3; setBankedCoins(bankedCoinsRef.current); awardCombo(400); spawnParticles(block.x + block.w / 2, block.y + block.h / 2, "#bd5428", 16); shakeRef.current = 6; playEffect("stomp"); syncHud(); }
        }
      });

      world.coins.forEach((coin) => {
        if (coin.collected) return;
        if (player.ability === "magnet" && player.power > 0) {
          const dx = player.x + player.w / 2 - coin.x;
          const dy = player.y + player.h / 2 - coin.y;
          if (Math.hypot(dx, dy) < 175) {
            coin.x += dx * Math.min(1, delta * 8);
            coin.y += dy * Math.min(1, delta * 8);
          }
        }
        const coinRect = { x: coin.x - 10, y: coin.y - 15, w: 20, h: 30 };
        if (gameRectsOverlap(player, coinRect)) { coin.collected = true; coinsRef.current += 1; bankedCoinsRef.current += 1; setBankedCoins(bankedCoinsRef.current); awardCombo(100); spawnParticles(coin.x, coin.y, "#ffd326", 10); playEffect("coin"); syncHud(); }
      });

      world.powers.forEach((power) => {
        if (power.collected || !gameRectsOverlap(player,{ x:power.x - 16,y:power.y - 16,w:32,h:32 })) return;
        power.collected = true; grantAbility(power.ability, power.x, power.y);
      });

      const secretPipe = world.pipes[1];
      const standingOnSecretPipe = player.grounded && player.x + player.w > secretPipe.x && player.x < secretPipe.x + secretPipe.w && Math.abs(player.y + player.h - secretPipe.y) < 5;
      if (inputRef.current.down && standingOnSecretPipe && !secretFoundRef.current) {
        secretFoundRef.current = true; coinsRef.current += 5; bankedCoinsRef.current += 5; setBankedCoins(bankedCoinsRef.current); awardCombo(1_000); spawnParticles(player.x + player.w / 2,player.y + player.h,"#63e973",24); playEffect("power");
        player.x = 1_650; player.y = 285; checkpointRef.current = 1_650; cameraRef.current = 1_500; syncHud();
      }

      world.enemies.forEach((enemy) => {
        if (!enemy.alive) return;
        if (enemy.behavior === "chase" && Math.abs(player.x - enemy.x) < 360) enemy.speed = Math.sign(player.x - enemy.x || 1) * Math.max(98,Math.abs(enemy.speed));
        enemy.x += enemy.speed * delta;
        if (enemy.x <= enemy.minX || enemy.x + enemy.w >= enemy.maxX) enemy.speed *= -1;
        if (!gameRectsOverlap(player, enemy)) return;
        if (player.vy > 90 && player.y + player.h - enemy.y < 22) {
          enemy.alive = false; player.vy = -310; awardCombo(250); spawnParticles(enemy.x + enemy.w / 2,enemy.y,"#8d64b3",12); shakeRef.current = 5; playEffect("stomp"); syncHud();
        } else loseLife();
      });

      world.hazards.forEach((hazard) => { if (gameRectsOverlap(player,hazard)) loseLife(); });

      if (player.x > 1_080) checkpointRef.current = Math.max(checkpointRef.current, 900);
      if (player.x > 2_050) checkpointRef.current = Math.max(checkpointRef.current, 1_660);
      if (player.y > GAME_HEIGHT + 80) loseLife();
      if (timeRef.current <= 0) { livesRef.current = 0; syncHud(); changeMode("over"); return; }
      if (player.x >= GAME_WORLD_WIDTH - 130) { scoreRef.current += Math.ceil(timeRef.current) * 10; syncHud(); playEffect("win"); changeMode("won"); return; }

      if (hudTimer > .25) { hudTimer = 0; syncHud(); }
      const cameraTarget = Math.max(0, Math.min(GAME_WORLD_WIDTH - GAME_WIDTH, player.x - 245 + player.vx * .55));
      cameraRef.current += (cameraTarget - cameraRef.current) * Math.min(1,delta * 5.5);
      drawMiniGame(context, world, player, cameraRef.current, totalSeconds, skin, shakeRef.current, characterImageRef.current);
      animationFrame = window.requestAnimationFrame(frame);
    };

    animationFrame = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [mode, playEffect, playTone, skin]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (modeRef.current !== "playing") return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "a", "d", "w", "s", "A", "D", "W", "S"].includes(event.key)) event.preventDefault();
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") setControl("left", true);
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") setControl("right", true);
      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") setControl("down", true);
      if (event.key === "ArrowUp" || event.key === " " || event.key.toLowerCase() === "w") setControl("jump", true);
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") setControl("left", false);
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") setControl("right", false);
      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") setControl("down", false);
      if (event.key === "ArrowUp" || event.key === " " || event.key.toLowerCase() === "w") setControl("jump", false);
    };
    window.addEventListener("keydown", keyDown, { passive: false }); window.addEventListener("keyup", keyUp);
    return () => { window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); };
  }, []);

  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => () => { if (audioRef.current) void audioRef.current.close(); }, []);

  const controlEvents = (control: "left" | "right" | "down" | "jump") => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setControl(control, true); },
    onPointerUp: () => setControl(control, false), onPointerCancel: () => setControl(control, false), onPointerLeave: () => setControl(control, false),
  });

  return (
    <section ref={gameRef} className={`mini-platform-game full-platform-game ${mode}`} tabIndex={0} aria-label="Joelix Jump side-scrolling platform game">
      <header>
        <div className="platform-game-title"><div className="platform-game-identity"><span className="player-face-badge" aria-hidden="true" /><div><span className="eyebrow">Hard mode · Ability boxes</span><h2>Joelix Jump · World 2-1</h2></div></div><div className="platform-game-tools"><button type="button" onClick={() => setMuted((value) => !value)}>{muted ? "Sound off" : "Sound on"}</button><button type="button" disabled={bankedCoins < 10 || mode === "playing"} onClick={() => setSkin((value) => value === "classic" ? "gold" : "classic")}>{bankedCoins < 10 ? `Gold skin ${bankedCoins}/10` : skin === "gold" ? "Gold skin on" : "Use gold skin"}</button></div></div>
        <div className="platform-game-hud" aria-live="polite">
          <span><small>Score</small><strong>{String(hud.score).padStart(6, "0")}</strong></span>
          <span><small>Coins</small><strong className="hud-coin">× {String(hud.coins).padStart(2, "0")}</strong></span>
          <span><small>Combo</small><strong className={hud.combo > 1 ? "hud-combo hot" : "hud-combo"}>× {hud.combo || 1}</strong></span>
          <span><small>Lives</small><strong>× {hud.lives}</strong></span>
          <span><small>Time</small><strong>{hud.time}</strong></span>
          <span><small>Ability</small><strong className="hud-power">{hud.ability ? `${GAME_ABILITIES[hud.ability].short} · ${hud.power}s` : "—"}</strong></span>
        </div>
      </header>
      <div className="ability-legend" aria-label="Ability box guide">
        {(Object.keys(GAME_ABILITIES) as GameAbility[]).map((ability) => <span key={ability} style={{ "--ability-color": GAME_ABILITIES[ability].color } as React.CSSProperties}><b>{GAME_ABILITIES[ability].short}</b><small>{GAME_ABILITIES[ability].label}</small></span>)}
      </div>
      <div className="full-game-stage">
        <canvas ref={canvasRef} width={GAME_WIDTH} height={GAME_HEIGHT} aria-label="Playable platform game world" />
        {abilityNotice && <div className="ability-pickup-popup" style={{ "--ability-color": GAME_ABILITIES[abilityNotice.ability].color } as React.CSSProperties}><b>{GAME_ABILITIES[abilityNotice.ability].short}</b><span><strong>{GAME_ABILITIES[abilityNotice.ability].label}</strong><small>{abilityNotice.detail}</small></span></div>}
        {mode !== "playing" && <div className="mini-game-overlay full-game-overlay">
          <span className="overlay-coin" aria-hidden="true" />
          <strong>{mode === "won" ? "Level clear!" : mode === "over" ? "Game over" : mode === "paused" ? "Game paused" : "Ready, Player 01?"}</strong>
          <p>{mode === "won" ? `You cleared Hard Mode with ${hud.coins} coins and ${hud.score} points.` : mode === "over" ? "Hard Mode beat you this time. Learn the ability boxes, reset the world, and run it again." : mode === "paused" ? "Your position is safe. Continue when you are ready." : "Hard Mode has wider gaps, more spikes, seven faster enemies, and only 140 seconds. Hit ? boxes for Turbo, Shield, Super Jump, or Coin Magnet."}</p>
          <button type="button" onClick={mode === "paused" ? () => changeMode("playing") : startGame}>{mode === "won" || mode === "over" ? "Play again" : mode === "paused" ? "Continue" : "Start game"}</button>
        </div>}
      </div>
      <footer className="full-game-controls">
        <div className="move-controls"><button type="button" aria-label="Move left" {...controlEvents("left")}>←</button><button type="button" aria-label="Move right" {...controlEvents("right")}>→</button><button type="button" aria-label="Move down or enter pipe" {...controlEvents("down")}>↓</button></div>
        <span>Move with <b>A / D</b> or <b>← / →</b>. Jump with <b>W, Space, or ↑</b>. Try <b>S / ↓</b> on pipes.</span>
        <div className="action-controls"><button type="button" className="pause-game" disabled={mode !== "playing"} onClick={() => changeMode("paused")}>PAUSE</button><button type="button" className="jump-game" aria-label="Jump" {...controlEvents("jump")}>JUMP</button></div>
      </footer>
    </section>
  );
}

function NextTask({ task, onComplete }: { task: CoinTask; onComplete: (task: CoinTask) => void }) {
  return (
    <article className={`next-task ${task.kind}`}>
      <span className="task-symbol">{task.icon}</span>
      <div><small>{task.category} · {task.recurrence}</small><strong>{task.name}</strong></div>
      <button onClick={() => onComplete(task)} aria-label={`Complete ${task.name}`}>
        {task.kind === "work" ? `+$${task.reward} · ${task.xp}XP` : `MUST DO · ${task.xp}XP`}
      </button>
    </article>
  );
}
