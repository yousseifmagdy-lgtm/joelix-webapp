"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { BuyableStore } from "./components/BuyableStore";
import { Coach, FloatingCoach } from "./components/Coach";
import { Dashboard } from "./components/Dashboard";
import { FoodLog } from "./components/FoodLog";
import { HistoryCharts } from "./components/HistoryCharts";
import { IdeasVault } from "./components/IdeasVault";
import { PlayerHub } from "./components/PlayerHub";
import { TaskList } from "./components/TaskList";
import { TodoPlanner } from "./components/TodoPlanner";
import { WorkoutTracker } from "./components/WorkoutTracker";
import { WhopRewards } from "./components/WhopRewards";
import { YouTubeContent, type YouTubeSavedState } from "./components/YouTubeContent";
import type { CalorieCycle, CoinTask, ContentPlatform, DebtEntry, FoodEntry, FuelState, MoodEntry, Screen, SpendEntry, TaskKind, TodoCategory, TodoPlannerState, UsdaFood, WeightEntry, WhopContentItem, WhopRewardRates } from "./components/types";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global { interface Window { __joelixInstallPrompt?: BeforeInstallPromptEvent | null; } }

const CALORIE_CYCLE_START = "2026-08-09";
const CALORIE_CYCLE_LENGTH = 10;
const CALORIE_CYCLE_BASE = 19_000;
const CALORIE_WALLET_VERSION = "cycle-19000-v5";
const FUEL_RESET_KEY = `${CALORIE_CYCLE_START}:${CALORIE_WALLET_VERSION}`;
const PREVIOUS_FUEL_CYCLE_KEY = "2026-08-08:cycle-19000-v5";
const DAY_MS = 86_400_000;
const defaultWhopRates: WhopRewardRates = { youtube: 0, instagram: 0, tiktok: 0 };
const defaultTodoPlanner = (): TodoPlannerState => ({ lists: [] });
const todoCategories = new Set<TodoCategory>(["Work", "Health", "Money", "Content", "Learning", "Personal", "Home", "Other"]);
const defaultFuelState = (): FuelState => {
  return {
    startDate: localDateKey(new Date()),
    targets: { calories: 1900, protein: 180, carbs: 175, fat: 53 },
    days: [],
    scheduleVersion: 2,
  };
};

function localDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 12);
}

function dateOnlyValue(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatCycleDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftFuelDate(value: string, count: number) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + count);
  return localDateKey(date);
}

function signedFuelDayGap(from: string, to: string) {
  const fromDate = new Date(`${from}T12:00:00`);
  const toDate = new Date(`${to}T12:00:00`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return 0;
  return Math.round((dateOnlyValue(toDate) - dateOnlyValue(fromDate)) / DAY_MS);
}

function calorieCycleFor(dayKey: string): CalorieCycle {
  const today = new Date(dayKey);
  const start = localDate(2026, 8, 9);
  const daysFromStart = Math.floor((dateOnlyValue(today) - dateOnlyValue(start)) / DAY_MS);
  if (daysFromStart < 0) {
    return {
      active: false,
      key: `scheduled:${CALORIE_CYCLE_START}:${CALORIE_WALLET_VERSION}`,
      baseCalories: CALORIE_CYCLE_BASE,
      length: CALORIE_CYCLE_LENGTH,
      day: 0,
      daysUntilStart: Math.abs(daysFromStart),
      startLabel: formatCycleDate(start),
      endLabel: formatCycleDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + CALORIE_CYCLE_LENGTH - 1, 12)),
    };
  }
  const cycleIndex = Math.floor(daysFromStart / CALORIE_CYCLE_LENGTH);
  const cycleStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() + cycleIndex * CALORIE_CYCLE_LENGTH, 12);
  const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth(), cycleStart.getDate() + CALORIE_CYCLE_LENGTH - 1, 12);
  return {
    active: true,
    key: `${localDateKey(cycleStart)}:${CALORIE_WALLET_VERSION}`,
    baseCalories: CALORIE_CYCLE_BASE,
    length: CALORIE_CYCLE_LENGTH,
    day: (daysFromStart % CALORIE_CYCLE_LENGTH) + 1,
    daysUntilStart: 0,
    startLabel: formatCycleDate(cycleStart),
    endLabel: formatCycleDate(cycleEnd),
  };
}

function canRestoreCalorieWallet(savedKey: string | undefined, currentKey: string) {
  return savedKey === currentKey || (savedKey === PREVIOUS_FUEL_CYCLE_KEY && currentKey === FUEL_RESET_KEY);
}

const physicalSeed: CoinTask[] = [
  { id: 1, name: "Morning run", category: "Cardio", reward: 300, xp: 60, recurrence: "Daily", kind: "physical", priority: "main", doneToday: false, icon: "R" },
  { id: 2, name: "8,000 steps", category: "Walking", reward: 220, xp: 45, recurrence: "Daily", kind: "physical", priority: "optional", doneToday: false, icon: "S" },
  { id: 3, name: "Mobility flow", category: "Stretching", reward: 80, xp: 20, recurrence: "Daily", kind: "physical", priority: "optional", doneToday: false, icon: "M" },
  { id: 4, name: "Weekend padel", category: "Sports", reward: 420, xp: 85, recurrence: "One-off", kind: "physical", priority: "optional", doneToday: false, icon: "P" },
];

const workSeed: CoinTask[] = [
  { id: 11, name: "Deep work block", category: "Freelance", reward: 85, xp: 45, recurrence: "Daily", kind: "work", priority: "main", doneToday: false, icon: "D" },
  { id: 12, name: "Ship client revision", category: "Client work", reward: 140, xp: 70, recurrence: "One-off", kind: "work", priority: "optional", doneToday: false, icon: "S" },
  { id: 13, name: "Inbox to zero", category: "Admin", reward: 25, xp: 20, recurrence: "Daily", kind: "work", priority: "optional", doneToday: false, icon: "I" },
  { id: 14, name: "Weekly home reset", category: "Chores", reward: 35, xp: 20, recurrence: "Daily", kind: "work", priority: "optional", doneToday: false, icon: "H" },
];

const bonusPools: Record<TaskKind, Array<Pick<CoinTask, "name" | "category" | "reward" | "xp" | "icon">>> = {
  physical: [
    { name: "100 jumping jacks", category: "Cardio · estimated burn", reward: 35, xp: 25, icon: "J" },
    { name: "10-minute stair climb", category: "Cardio · estimated burn", reward: 90, xp: 40, icon: "T" },
    { name: "15-minute jump rope", category: "Cardio · estimated burn", reward: 170, xp: 55, icon: "R" },
    { name: "20-minute brisk walk", category: "Walking · estimated burn", reward: 110, xp: 35, icon: "W" },
    { name: "10-minute shadow boxing", category: "Cardio · estimated burn", reward: 80, xp: 40, icon: "X" },
    { name: "15-minute easy jog", category: "Cardio · estimated burn", reward: 130, xp: 45, icon: "J" },
    { name: "20-minute steady run", category: "Cardio · estimated burn", reward: 220, xp: 60, icon: "R" },
    { name: "10 rounds of 20-sec sprint intervals", category: "Cardio · estimated burn", reward: 145, xp: 55, icon: "S" },
    { name: "20-minute outdoor cycling", category: "Cardio · estimated burn", reward: 170, xp: 50, icon: "C" },
    { name: "15-minute rowing machine", category: "Cardio · estimated burn", reward: 140, xp: 50, icon: "R" },
    { name: "15-minute elliptical", category: "Cardio · estimated burn", reward: 130, xp: 45, icon: "E" },
    { name: "12-minute incline treadmill walk", category: "Cardio · estimated burn", reward: 115, xp: 45, icon: "I" },
    { name: "15-minute dance cardio", category: "Cardio · estimated burn", reward: 105, xp: 40, icon: "D" },
    { name: "10-minute high-knees intervals", category: "Cardio · estimated burn", reward: 95, xp: 40, icon: "H" },
    { name: "12-minute bench step-ups", category: "Cardio · estimated burn", reward: 100, xp: 40, icon: "U" },
    { name: "15-minute low-impact cardio", category: "Cardio · estimated burn", reward: 85, xp: 35, icon: "L" },
    { name: "10-minute shuttle runs", category: "Cardio · estimated burn", reward: 110, xp: 45, icon: "S" },
    { name: "25-minute power walk", category: "Cardio · estimated burn", reward: 135, xp: 40, icon: "W" },
    { name: "20-minute stationary bike", category: "Cardio · estimated burn", reward: 155, xp: 45, icon: "B" },
    { name: "15-minute fast walk", category: "Cardio · estimated burn", reward: 80, xp: 35, icon: "W" },
    { name: "12-minute stair intervals", category: "Cardio · estimated burn", reward: 115, xp: 45, icon: "T" },
    { name: "20-minute hill walk", category: "Cardio · estimated burn", reward: 145, xp: 45, icon: "H" },
    { name: "10-minute skater-hop intervals", category: "Cardio · estimated burn", reward: 95, xp: 40, icon: "K" },
    { name: "12-minute boxer-skip workout", category: "Cardio · estimated burn", reward: 105, xp: 40, icon: "B" },
    { name: "15-minute aerobic circuit", category: "Cardio · estimated burn", reward: 115, xp: 45, icon: "A" },
    { name: "15-minute spin intervals", category: "Cardio · estimated burn", reward: 165, xp: 50, icon: "S" },
    { name: "12-minute battle-rope intervals", category: "Cardio · estimated burn", reward: 135, xp: 50, icon: "R" },
    { name: "20-minute treadmill walk-run", category: "Cardio · estimated burn", reward: 160, xp: 50, icon: "T" },
    { name: "15-minute march-and-jog intervals", category: "Cardio · estimated burn", reward: 100, xp: 40, icon: "M" },
    { name: "10-minute speed-rope intervals", category: "Cardio · estimated burn", reward: 125, xp: 45, icon: "R" },
    { name: "50 burpees", category: "Workout · estimated burn", reward: 50, xp: 40, icon: "B" },
    { name: "50 bodyweight squats", category: "Workout · estimated burn", reward: 25, xp: 25, icon: "S" },
    { name: "100 mountain climbers", category: "Workout · estimated burn", reward: 45, xp: 30, icon: "M" },
    { name: "40 walking lunges", category: "Workout · estimated burn", reward: 30, xp: 25, icon: "L" },
    { name: "30 push-ups + 60-sec plank", category: "Workout · estimated burn", reward: 25, xp: 30, icon: "P" },
    { name: "20-minute full-body dumbbell workout", category: "Workout · estimated burn", reward: 120, xp: 55, icon: "D" },
    { name: "15-minute kettlebell circuit", category: "Workout · estimated burn", reward: 145, xp: 55, icon: "K" },
    { name: "20-minute resistance-band workout", category: "Workout · estimated burn", reward: 90, xp: 45, icon: "B" },
    { name: "15-minute upper-body circuit", category: "Workout · estimated burn", reward: 85, xp: 45, icon: "U" },
    { name: "15-minute lower-body circuit", category: "Workout · estimated burn", reward: 105, xp: 45, icon: "L" },
    { name: "12-minute bodyweight HIIT", category: "Workout · estimated burn", reward: 120, xp: 50, icon: "H" },
    { name: "15-minute full-body EMOM", category: "Workout · estimated burn", reward: 125, xp: 50, icon: "E" },
    { name: "4-round core circuit", category: "Workout · estimated burn", reward: 60, xp: 35, icon: "C" },
    { name: "15-minute glute workout", category: "Workout · estimated burn", reward: 75, xp: 40, icon: "G" },
    { name: "3-round calisthenics circuit", category: "Workout · estimated burn", reward: 100, xp: 45, icon: "C" },
    { name: "Push circuit: chest, shoulders, triceps", category: "Workout · estimated burn", reward: 95, xp: 45, icon: "P" },
    { name: "Pull circuit: back and biceps", category: "Workout · estimated burn", reward: 90, xp: 45, icon: "P" },
    { name: "Shoulder and arm superset workout", category: "Workout · estimated burn", reward: 85, xp: 45, icon: "A" },
    { name: "Chest and back superset workout", category: "Workout · estimated burn", reward: 105, xp: 50, icon: "C" },
    { name: "Leg day bodyweight workout", category: "Workout · estimated burn", reward: 115, xp: 50, icon: "L" },
    { name: "5-round total-body conditioning", category: "Workout · estimated burn", reward: 135, xp: 55, icon: "T" },
    { name: "100 controlled sit-ups", category: "Workout · estimated burn", reward: 55, xp: 35, icon: "A" },
    { name: "5 rounds: push-ups, squats, climbers", category: "Workout · estimated burn", reward: 105, xp: 45, icon: "F" },
    { name: "15-minute dumbbell complex", category: "Workout · estimated burn", reward: 130, xp: 55, icon: "D" },
    { name: "100 kettlebell swings", category: "Workout · estimated burn", reward: 110, xp: 50, icon: "K" },
    { name: "10 rounds of farmer carries", category: "Workout · estimated burn", reward: 80, xp: 45, icon: "F" },
    { name: "3-minute wall sit + 100 calf raises", category: "Workout · estimated burn", reward: 45, xp: 35, icon: "W" },
    { name: "10-minute plank ladder", category: "Workout · estimated burn", reward: 50, xp: 35, icon: "P" },
    { name: "Pull-up ladder to 25 reps", category: "Workout · estimated burn", reward: 55, xp: 40, icon: "U" },
    { name: "5 rounds of dips and push-ups", category: "Workout · estimated burn", reward: 70, xp: 40, icon: "D" },
    { name: "Squat-and-lunge ladder", category: "Workout · estimated burn", reward: 75, xp: 40, icon: "S" },
    { name: "15-minute posterior-chain workout", category: "Workout · estimated burn", reward: 90, xp: 45, icon: "P" },
    { name: "15-minute single-leg workout", category: "Workout · estimated burn", reward: 85, xp: 45, icon: "L" },
    { name: "20-minute dumbbell push workout", category: "Workout · estimated burn", reward: 110, xp: 50, icon: "P" },
    { name: "20-minute dumbbell pull workout", category: "Workout · estimated burn", reward: 105, xp: 50, icon: "P" },
    { name: "20-minute strength-endurance circuit", category: "Workout · estimated burn", reward: 120, xp: 55, icon: "S" },
    { name: "5 sets of tempo squats", category: "Workout · estimated burn", reward: 65, xp: 40, icon: "T" },
    { name: "12-minute explosive-power circuit", category: "Workout · estimated burn", reward: 115, xp: 50, icon: "E" },
    { name: "15-minute abs and obliques workout", category: "Workout · estimated burn", reward: 65, xp: 40, icon: "A" },
    { name: "20-minute no-equipment full body", category: "Workout · estimated burn", reward: 110, xp: 50, icon: "N" },
    { name: "15-minute yoga flow", category: "Mobility · estimated burn", reward: 45, xp: 30, icon: "Y" },
    { name: "12-minute full-body mobility flow", category: "Mobility · estimated burn", reward: 35, xp: 25, icon: "M" },
    { name: "10-minute dynamic stretching", category: "Mobility · estimated burn", reward: 30, xp: 25, icon: "D" },
    { name: "12-minute hips and ankles mobility", category: "Mobility · estimated burn", reward: 32, xp: 25, icon: "H" },
    { name: "10-minute shoulders and spine mobility", category: "Mobility · estimated burn", reward: 28, xp: 25, icon: "S" },
    { name: "15-minute beginner Pilates", category: "Mobility · estimated burn", reward: 55, xp: 35, icon: "P" },
    { name: "15-minute post-workout recovery stretch", category: "Mobility · estimated burn", reward: 35, xp: 25, icon: "R" },
    { name: "10-minute hamstring and calf mobility", category: "Mobility · estimated burn", reward: 28, xp: 25, icon: "H" },
    { name: "12-minute hip-opening flow", category: "Mobility · estimated burn", reward: 32, xp: 25, icon: "H" },
    { name: "10-minute thoracic mobility", category: "Mobility · estimated burn", reward: 26, xp: 25, icon: "T" },
    { name: "8-minute wrist and forearm mobility", category: "Mobility · estimated burn", reward: 20, xp: 20, icon: "W" },
    { name: "15-minute foam-roll recovery", category: "Mobility · estimated burn", reward: 30, xp: 25, icon: "F" },
    { name: "10-minute balance and stability flow", category: "Mobility · estimated burn", reward: 30, xp: 25, icon: "B" },
    { name: "10-minute morning wake-up stretch", category: "Mobility · estimated burn", reward: 25, xp: 20, icon: "M" },
    { name: "12-minute evening recovery flow", category: "Mobility · estimated burn", reward: 30, xp: 25, icon: "E" },
    { name: "30-minute football practice", category: "Sports · estimated burn", reward: 240, xp: 65, icon: "F" },
    { name: "30-minute padel session", category: "Sports · estimated burn", reward: 210, xp: 60, icon: "P" },
    { name: "30-minute basketball practice", category: "Sports · estimated burn", reward: 230, xp: 65, icon: "B" },
    { name: "20-minute swimming session", category: "Sports · estimated burn", reward: 190, xp: 60, icon: "S" },
    { name: "30-minute tennis practice", category: "Sports · estimated burn", reward: 220, xp: 65, icon: "T" },
    { name: "20-minute heavy-bag boxing", category: "Sports · estimated burn", reward: 180, xp: 60, icon: "B" },
    { name: "30-minute badminton session", category: "Sports · estimated burn", reward: 175, xp: 55, icon: "B" },
    { name: "30-minute table-tennis session", category: "Sports · estimated burn", reward: 120, xp: 45, icon: "T" },
    { name: "30-minute volleyball practice", category: "Sports · estimated burn", reward: 170, xp: 55, icon: "V" },
    { name: "30-minute handball practice", category: "Sports · estimated burn", reward: 225, xp: 65, icon: "H" },
    { name: "25-minute squash session", category: "Sports · estimated burn", reward: 240, xp: 65, icon: "S" },
    { name: "40-minute trail hike", category: "Sports · estimated burn", reward: 260, xp: 70, icon: "H" },
    { name: "25-minute martial-arts drills", category: "Sports · estimated burn", reward: 195, xp: 60, icon: "M" },
    { name: "30-minute freestyle dance session", category: "Sports · estimated burn", reward: 185, xp: 55, icon: "D" },
    { name: "30-minute skating session", category: "Sports · estimated burn", reward: 190, xp: 60, icon: "S" },
  ],
  work: [
    { name: "Send one useful client pitch", category: "Daily surprise", reward: 30, xp: 35, icon: "B" },
    { name: "Learn one marketable skill for 20 min", category: "Daily surprise", reward: 25, xp: 30, icon: "B" },
    { name: "Follow up with one opportunity", category: "Daily surprise", reward: 20, xp: 30, icon: "B" },
    { name: "Improve one portfolio example", category: "Daily surprise", reward: 35, xp: 40, icon: "B" },
    { name: "Write tomorrow's money task", category: "Daily surprise", reward: 15, xp: 25, icon: "B" },
  ],
};

function seededShuffle<T>(items: T[], seed: number) {
  const shuffled = [...items];
  let state = seed >>> 0;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const random = ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
    const target = Math.floor(random * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

function makeDailyBonuses(kind: TaskKind, dayKey: string, completedIds: number[]): CoinTask[] {
  const dayNumber = Math.floor(new Date(dayKey).getTime() / 86_400_000);
  const pool = bonusPools[kind];
  const indexedPool = pool.map((bonus, poolIndex) => ({ bonus, poolIndex }));
  const dailySeed = Math.abs(dayNumber) + (kind === "physical" ? 20_260_727 : 90_001);
  const selections = kind === "physical"
    ? seededShuffle([
        ...seededShuffle(indexedPool.filter(({ bonus }) => bonus.category.startsWith("Cardio") || bonus.category.startsWith("Walking")), dailySeed + 11).slice(0, 4),
        ...seededShuffle(indexedPool.filter(({ bonus }) => bonus.category.startsWith("Workout")), dailySeed + 23).slice(0, 4),
        ...seededShuffle(indexedPool.filter(({ bonus }) => bonus.category.startsWith("Mobility")), dailySeed + 37).slice(0, 1),
        ...seededShuffle(indexedPool.filter(({ bonus }) => bonus.category.startsWith("Sports")), dailySeed + 47).slice(0, 1),
      ], dailySeed + 59)
    : seededShuffle(indexedPool, dailySeed).slice(0, 1);

  return selections.map(({ bonus, poolIndex }) => {
    const id = 900_000 + dayNumber * 1_000 + (kind === "work" ? 500 : 0) + poolIndex;
    return { id, ...bonus, recurrence: "Daily", kind, priority: "bonus", doneToday: completedIds.includes(id) };
  });
}

const emptyHistory = () => ({
  calorieBalances: Array<number>(6).fill(0),
  moneyEarned: Array<number>(6).fill(0),
  tasksCompleted: Array<number>(6).fill(0),
  streak: 0,
});

type GameHistory = ReturnType<typeof emptyHistory>;

function dayGap(fromDayKey: string, toDayKey: string) {
  const from = new Date(fromDayKey);
  const to = new Date(toDayKey);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  return Math.max(0, Math.floor((dateOnlyValue(to) - dateOnlyValue(from)) / DAY_MS));
}

function rollHistory(history: GameHistory, calorieBalance: number, moneyEarned: number, tasksCompleted: number, elapsedDays = 1): GameHistory {
  const missingDays = Array(Math.max(0, elapsedDays - 1)).fill(0) as number[];
  return {
    calorieBalances: [...history.calorieBalances, calorieBalance, ...missingDays].slice(-6),
    moneyEarned: [...history.moneyEarned, moneyEarned, ...missingDays].slice(-6),
    tasksCompleted: [...history.tasksCompleted, tasksCompleted, ...missingDays].slice(-6),
    streak: elapsedDays === 1 && tasksCompleted > 0 ? history.streak + 1 : 0,
  };
}

type SavedGameState = {
  physicalTasks?: CoinTask[];
  workTasks?: CoinTask[];
  foodEntries?: FoodEntry[];
  savedFoods?: UsdaFood[];
  fuelState?: FuelState;
  moneyBalance?: number;
  debts?: DebtEntry[];
  debtBalance?: number;
  debtFor?: string;
  todayMoneyEarned?: number;
  spendEntries?: SpendEntry[];
  tasksCompletedToday?: number;
  historyStats?: GameHistory;
  dayKey?: string;
  bonusDone?: Partial<Record<TaskKind, number[] | boolean>>;
  calorieCycleKey?: string;
  whopContent?: WhopContentItem[];
  whopRates?: Partial<WhopRewardRates>;
  youtubeState?: YouTubeSavedState;
  todoPlanner?: TodoPlannerState;
};

const navItems: { id: Screen; label: string; icon: string; mobile?: boolean }[] = [
  { id: "home", label: "Home", icon: "⌂", mobile: true },
  { id: "tasks", label: "Quests", icon: "⚔", mobile: true },
  { id: "todo", label: "To Do", icon: "✓", mobile: true },
  { id: "workout", label: "Workout", icon: "🏋", mobile: true },
  { id: "youtube", label: "YouTube", icon: "▶", mobile: true },
  { id: "whop", label: "Whop", icon: "V", mobile: true },
  { id: "ideas", label: "Ideas", icon: "💡", mobile: true },
  { id: "food", label: "Fuel", icon: "🍎", mobile: true },
  { id: "player", label: "Profile", icon: "♟", mobile: true },
  { id: "coach", label: "The Best", icon: "★", mobile: true },
  { id: "store", label: "Store", icon: "💰" },
  { id: "history", label: "Stats", icon: "▥" },
];

export default function Home() {
  const [activeScreen, setActiveScreen] = useState<Screen>("home");
  const [taskTab, setTaskTab] = useState<TaskKind>("physical");
  const [physicalTasks, setPhysicalTasks] = useState<CoinTask[]>(physicalSeed);
  const [workTasks, setWorkTasks] = useState<CoinTask[]>(workSeed);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [savedFoods, setSavedFoods] = useState<UsdaFood[]>([]);
  const [fuelState, setFuelState] = useState<FuelState>(defaultFuelState);
  const [moneyBalance, setMoneyBalance] = useState(0);
  const [debts, setDebts] = useState<DebtEntry[]>([]);
  const [todayMoneyEarned, setTodayMoneyEarned] = useState(0);
  const [spendEntries, setSpendEntries] = useState<SpendEntry[]>([]);
  const [tasksCompletedToday, setTasksCompletedToday] = useState(0);
  const [historyStats, setHistoryStats] = useState<GameHistory>(emptyHistory);
  const [xp, setXp] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [playerTag, setPlayerTag] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmMinutes, setAlarmMinutes] = useState(60);
  const [cloudReady, setCloudReady] = useState(false);
  const [gameStateLoaded, setGameStateLoaded] = useState(false);
  const [dayKey, setDayKey] = useState(() => new Date().toDateString());
  const [calorieCycleKey, setCalorieCycleKey] = useState(() => calorieCycleFor(new Date().toDateString()).key);
  const [bonusDone, setBonusDone] = useState<Record<TaskKind, number[]>>({ physical: [], work: [] });
  const [toast, setToast] = useState<{ id: number; text: string; tone: "calorie" | "money" | "spend" } | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [whopContent, setWhopContent] = useState<WhopContentItem[]>([]);
  const [whopRates, setWhopRates] = useState<WhopRewardRates>(defaultWhopRates);
  const [youtubeState, setYoutubeState] = useState<YouTubeSavedState | null>(null);
  const [todoPlanner, setTodoPlanner] = useState<TodoPlannerState>(defaultTodoPlanner);
  const [sidebarPinned, setSidebarPinned] = useState(false);

  const fuelServiceDate = useMemo(() => {
    const today = localDateKey(new Date());
    return today < fuelState.startDate ? fuelState.startDate : today;
  }, [fuelState.startDate]);
  const todayFuelFoods = useMemo(() => {
    return fuelState.days.find((day) => day.date === fuelServiceDate)?.meals.flatMap((meal) => meal.foods) ?? [];
  }, [fuelState.days, fuelServiceDate]);
  const caloriesEaten = useMemo(() => Math.round(todayFuelFoods.reduce((total, entry) => total + entry.calories, 0)), [todayFuelFoods]);
  const calorieBase = fuelState.targets.calories;
  const calorieBalance = calorieBase - caloriesEaten;
  const activeDebts = useMemo(() => debts.filter((debt) => debt.status === "active" && debt.remaining > 0), [debts]);
  const debtBalance = useMemo(() => activeDebts.reduce((total, debt) => total + debt.remaining, 0), [activeDebts]);
  const debtFor = activeDebts.length === 1 ? activeDebts[0].creditor : activeDebts.length > 1 ? `${activeDebts.length} creditors` : "";
  const buyableAllowance = moneyBalance * 0.3;
  const charityAllowance = moneyBalance * 0.1;
  const protectedMoney = moneyBalance * 0.6;
  const spentThisMonth = useMemo(() => spendEntries.reduce((total, entry) => total + entry.amount, 0), [spendEntries]);
  const buyableAvailable = buyableAllowance - spentThisMonth;
  const physicalBonuses = useMemo(() => makeDailyBonuses("physical", dayKey, bonusDone.physical), [dayKey, bonusDone.physical]);
  const workBonuses = useMemo(() => makeDailyBonuses("work", dayKey, bonusDone.work), [dayKey, bonusDone.work]);
  const avatarInitials = useMemo(() => {
    const source = displayName.trim() || playerTag.trim() || "Player One";
    return source.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
  }, [displayName, playerTag]);

  const saveWellness = useCallback(async (body: object) => {
    try {
      const response = await fetch("/api/wellness", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) return false;
      setCloudReady(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const saveYouTubeState = useCallback(async (state: YouTubeSavedState) => {
    setYoutubeState(state);
    return saveWellness({ action: "youtube_state", youtubeState: state });
  }, [saveWellness]);

  useEffect(() => {
    fetch("/api/wellness").then(async (response) => {
      const data = await response.json() as {
        profile?: { xp?: number; alarmEnabled?: boolean; alarmMinutes?: number; displayName?: string; playerTag?: string; primaryGoal?: string };
        gameState?: SavedGameState;
        weights?: WeightEntry[];
        moods?: MoodEntry[];
      };
      if (!response.ok) return;
      setCloudReady(true);
      setXp(data.profile?.xp ?? 0);
      setDisplayName(data.profile?.displayName ?? "");
      setPlayerTag(data.profile?.playerTag ?? "");
      setPrimaryGoal(data.profile?.primaryGoal ?? "");
      setAlarmEnabled(Boolean(data.profile?.alarmEnabled));
      setAlarmMinutes(data.profile?.alarmMinutes ?? 60);
      setWeights(data.weights ?? []);
      setMoods(data.moods ?? []);
      const saved = data.gameState;
      if (saved) {
        const currentDayKey = new Date().toDateString();
        const savedDayKey = typeof saved.dayKey === "string" ? saved.dayKey : currentDayKey;
        const elapsedDays = dayGap(savedDayKey, currentDayKey);
        const crossedDay = elapsedDays > 0;
        const currentCycleKey = calorieCycleFor(currentDayKey).key;
        const savedPhysicalTasks = Array.isArray(saved.physicalTasks) ? saved.physicalTasks : physicalSeed;
        const savedWorkTasks = Array.isArray(saved.workTasks) ? saved.workTasks : workSeed;
        setPhysicalTasks(crossedDay ? savedPhysicalTasks.map((task) => task.recurrence === "Daily" ? { ...task, doneToday: false } : task) : savedPhysicalTasks);
        setWorkTasks(crossedDay ? savedWorkTasks.map((task) => task.recurrence === "Daily" ? { ...task, doneToday: false } : task) : savedWorkTasks);
        if (canRestoreCalorieWallet(saved.calorieCycleKey, currentCycleKey)) {
          if (Array.isArray(saved.foodEntries)) setFoodEntries(saved.foodEntries);
          if (Array.isArray(saved.savedFoods)) setSavedFoods(saved.savedFoods);
        } else {
          setFoodEntries([]);
          if (Array.isArray(saved.savedFoods)) setSavedFoods(saved.savedFoods);
        }
        if (saved.fuelState && Array.isArray(saved.fuelState.days) && saved.fuelState.targets) {
          const storedStartDate = typeof saved.fuelState.startDate === "string" ? saved.fuelState.startDate : defaultFuelState().startDate;
          const migrateFuelSchedule = Number(saved.fuelState.scheduleVersion || 0) < 2;
          const todayFuelDate = localDateKey(new Date());
          const scheduleShift = migrateFuelSchedule ? signedFuelDayGap(storedStartDate, todayFuelDate) : 0;
          setFuelState({
            startDate: migrateFuelSchedule ? todayFuelDate : storedStartDate,
            targets: {
              calories: Math.max(800, Number(saved.fuelState.targets.calories) || 1900),
              protein: Math.max(0, Number(saved.fuelState.targets.protein) || 180),
              carbs: Math.max(0, Number(saved.fuelState.targets.carbs) || 175),
              fat: Math.max(0, Number(saved.fuelState.targets.fat) || 53),
            },
            days: migrateFuelSchedule ? saved.fuelState.days.map((day) => ({ ...day, date: shiftFuelDate(day.date, scheduleShift) })) : saved.fuelState.days,
            scheduleVersion: 2,
          });
        } else if (Array.isArray(saved.foodEntries) && saved.foodEntries.length > 0) {
          setFuelState({
            ...defaultFuelState(),
            days: [{
              date: localDateKey(new Date()),
              meals: [{
                id: `imported-${Date.now()}`,
                name: "Imported plates",
                foods: saved.foodEntries.map((food, index) => ({
                  id: `imported-food-${food.id}-${index}`,
                  name: food.name,
                  usdaFdcId: food.fdcId,
                  source: food.source || "Joelix legacy log",
                  quantity: 1,
                  unit: "serving" as const,
                  gramsPerUnit: 100,
                  quantityGrams: 100,
                  calories: food.calories,
                  protein: food.protein || 0,
                  carbs: food.carbs || 0,
                  fat: food.fat || 0,
                })),
              }],
            }],
          });
        }
        if (Number.isFinite(saved.moneyBalance)) setMoneyBalance(saved.moneyBalance!);
        if (Array.isArray(saved.debts)) {
          setDebts(saved.debts
            .filter((debt) => debt && Number.isFinite(debt.id) && typeof debt.creditor === "string" && Number.isFinite(debt.amount))
            .map((debt) => {
              const amount = Math.max(0, Number(debt.amount) || 0);
              const remaining = Math.max(0, Math.min(amount, Number(debt.remaining) || 0));
              return {
                ...debt,
                creditor: debt.creditor.trim() || "Unnamed creditor",
                amount,
                remaining,
                status: remaining > 0 && debt.status !== "paid" ? "active" as const : "paid" as const,
                createdOn: typeof debt.createdOn === "string" ? debt.createdOn : new Date().toISOString().slice(0, 10),
              };
            }));
        } else if (Number.isFinite(saved.debtBalance) && saved.debtBalance! > 0) {
          const legacyAmount = Math.max(0, Number(saved.debtBalance) || 0);
          setDebts([{
            id: Date.now(),
            creditor: typeof saved.debtFor === "string" && saved.debtFor.trim() ? saved.debtFor.trim() : "Previous debt",
            amount: legacyAmount,
            remaining: legacyAmount,
            createdOn: new Date().toISOString().slice(0, 10),
            status: "active",
          }]);
        }
        const savedTodayMoney = Number.isFinite(saved.todayMoneyEarned) ? saved.todayMoneyEarned! : 0;
        const savedTaskCount = Number.isFinite(saved.tasksCompletedToday) ? saved.tasksCompletedToday! : 0;
        setTodayMoneyEarned(crossedDay ? 0 : savedTodayMoney);
        if (Array.isArray(saved.spendEntries)) setSpendEntries(saved.spendEntries);
        setTasksCompletedToday(crossedDay ? 0 : savedTaskCount);
        const savedHistory = saved.historyStats ?? emptyHistory();
        if (crossedDay) {
          const savedCycle = calorieCycleFor(savedDayKey);
          const savedEaten = Array.isArray(saved.foodEntries) ? saved.foodEntries.reduce((total, entry) => total + entry.calories, 0) : 0;
          const savedBase = savedCycle.active && saved.calorieCycleKey === savedCycle.key ? savedCycle.baseCalories : 0;
          setHistoryStats(rollHistory(savedHistory, savedBase - savedEaten, savedTodayMoney, savedTaskCount, elapsedDays));
        } else setHistoryStats(savedHistory);
        setDayKey(currentDayKey);
        const savedBonusDone = saved.bonusDone;
        setBonusDone(crossedDay ? { physical: [], work: [] } : {
          physical: Array.isArray(savedBonusDone?.physical) ? savedBonusDone.physical.filter((id) => Number.isFinite(id)) : [],
          work: Array.isArray(savedBonusDone?.work) ? savedBonusDone.work.filter((id) => Number.isFinite(id)) : [],
        });
        setCalorieCycleKey(currentCycleKey);
        if (Array.isArray(saved.whopContent)) {
          setWhopContent(saved.whopContent
            .filter((item) => item && Number.isFinite(item.id) && typeof item.title === "string" && ["youtube", "instagram", "tiktok"].includes(item.platform))
            .map((item) => ({ ...item, views: Math.max(0, Number(item.views) || 0), claimed: Boolean(item.claimed) })));
        }
        if (saved.whopRates && typeof saved.whopRates === "object") {
          setWhopRates({
            youtube: Math.max(0, Number(saved.whopRates.youtube) || 0),
            instagram: Math.max(0, Number(saved.whopRates.instagram) || 0),
            tiktok: Math.max(0, Number(saved.whopRates.tiktok) || 0),
          });
        }
        if (saved.youtubeState && typeof saved.youtubeState === "object") setYoutubeState(saved.youtubeState);
        if (saved.todoPlanner && Array.isArray(saved.todoPlanner.lists)) {
          setTodoPlanner({
            lists: saved.todoPlanner.lists
              .filter((list) => list && typeof list.id === "string" && typeof list.title === "string" && typeof list.date === "string")
              .map((list) => ({
                ...list,
                category: todoCategories.has(list.category) ? list.category : "Other" as const,
                items: Array.isArray(list.items) ? list.items
                  .filter((item) => item && typeof item.id === "string" && typeof item.title === "string")
                  .map((item) => {
                    const progress = Math.max(0, Math.min(100, Number(item.progress) || 0));
                    return { ...item, progress, done: progress >= 100, createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString() };
                  }) : [],
              })),
          });
        }
      }
      setGameStateLoaded(true);
    }).catch(() => setGameStateLoaded(true));
  }, []);

  useEffect(() => {
    if (!gameStateLoaded) return;
    const timer = window.setTimeout(() => {
      void saveWellness({
        action: "game_state",
        gameState: { physicalTasks, workTasks, foodEntries, savedFoods, fuelState, moneyBalance, debts, debtBalance, debtFor, todayMoneyEarned, spendEntries, tasksCompletedToday, historyStats, dayKey, bonusDone, calorieCycleKey, whopContent, whopRates, youtubeState, todoPlanner },
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [gameStateLoaded, physicalTasks, workTasks, foodEntries, savedFoods, fuelState, moneyBalance, debts, debtBalance, debtFor, todayMoneyEarned, spendEntries, tasksCompletedToday, historyStats, dayKey, bonusDone, calorieCycleKey, whopContent, whopRates, youtubeState, todoPlanner]);

  useEffect(() => {
    if (!gameStateLoaded) return;
    const currentWalletKey = calorieCycleFor(dayKey).key;
    if (calorieCycleKey === currentWalletKey) return;
    if (canRestoreCalorieWallet(calorieCycleKey, currentWalletKey)) {
      setCalorieCycleKey(currentWalletKey);
      showToast("Fuel calendar updated · Today is Day 1/10", "calorie");
      return;
    }
    if (currentWalletKey === FUEL_RESET_KEY) {
      setFoodEntries([]);
      setHistoryStats((history) => ({ ...history, calorieBalances: Array<number>(6).fill(0) }));
      setCalorieCycleKey(currentWalletKey);
      showToast("Fuel reset · Saved Joelix foods kept", "calorie");
      return;
    }
    setFoodEntries([]);
    setCalorieCycleKey(currentWalletKey);
    showToast("Fuel reset · 19,000 calories ready for 10 days", "calorie");
  }, [gameStateLoaded, dayKey, calorieCycleKey]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nowKey = new Date().toDateString();
      if (nowKey !== dayKey) {
        const nextCycleKey = calorieCycleFor(nowKey).key;
        setHistoryStats((history) => rollHistory(history, calorieBalance, todayMoneyEarned, tasksCompletedToday));
        setDayKey(nowKey); setTodayMoneyEarned(0); setTasksCompletedToday(0); setBonusDone({ physical: [], work: [] });
        if (nextCycleKey !== calorieCycleKey) {
          setFoodEntries([]);
          setCalorieCycleKey(nextCycleKey);
        }
        setPhysicalTasks((tasks) => tasks.map((task) => task.recurrence === "Daily" ? { ...task, doneToday: false } : task));
        setWorkTasks((tasks) => tasks.map((task) => task.recurrence === "Daily" ? { ...task, doneToday: false } : task));
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [dayKey, calorieCycleKey, calorieBalance, todayMoneyEarned, tasksCompletedToday]);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));
    window.setTimeout(() => setIsInstalled(standalone), 0);
    if ("serviceWorker" in navigator) {
      const isDevelopment = Array.from(document.scripts).some((script) => script.src.includes("/@vite/client"));
      if (isDevelopment) {
        // A development service worker can keep an obsolete Vite client alive
        // after the local server stops. Remove it so reloads use the real app.
        navigator.serviceWorker.getRegistrations()
          .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
          .then(() => "caches" in window ? caches.keys() : [])
          .then((keys) => Promise.all(keys.filter((key) => key.startsWith("joelix-game-")).map((key) => caches.delete(key))))
          .catch(() => undefined);
      } else {
        navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      }
    }
    const ready = (event: Event) => { event.preventDefault(); const prompt = event as BeforeInstallPromptEvent; window.__joelixInstallPrompt = prompt; setInstallPrompt(prompt); };
    const cached = () => { if (window.__joelixInstallPrompt) setInstallPrompt(window.__joelixInstallPrompt); };
    const installed = () => { setIsInstalled(true); setInstallPrompt(null); window.__joelixInstallPrompt = null; };
    cached(); window.addEventListener("beforeinstallprompt", ready); window.addEventListener("joelix-install-ready", cached); window.addEventListener("appinstalled", installed);
    return () => { window.removeEventListener("beforeinstallprompt", ready); window.removeEventListener("joelix-install-ready", cached); window.removeEventListener("appinstalled", installed); };
  }, []);

  const showToast = (text: string, tone: "calorie" | "money" | "spend") => {
    const id = Date.now(); setToast({ id, text, tone });
    window.setTimeout(() => setToast((current) => current?.id === id ? null : current), 2200);
  };

  const completeTask = (task: CoinTask) => {
    if (task.doneToday) return;
    const update = (tasks: CoinTask[]) => tasks.map((item) => item.id === task.id ? { ...item, doneToday: true } : item);
    if (task.priority === "bonus") setBonusDone((done) => ({ ...done, [task.kind]: [...done[task.kind], task.id] }));
    if (task.kind === "physical") {
      if (task.priority !== "bonus") setPhysicalTasks(update);
      showToast(`Must Do complete · +${task.xp} XP`, "calorie");
    }
    else { if (task.priority !== "bonus") setWorkTasks(update); setMoneyBalance((value) => value + task.reward); setTodayMoneyEarned((value) => value + task.reward); showToast(`+$${task.reward} money · +${task.xp} XP`, "money"); }
    setXp((value) => Math.min(9900, value + task.xp));
    setTasksCompletedToday((value) => value + 1);
    void saveWellness({ action: "xp", amount: task.xp });
  };

  const addTask = (task: Omit<CoinTask, "id" | "doneToday" | "icon" | "xp">) => {
    const calculatedXp = task.kind === "physical"
      ? Math.min(150, Math.max(10, Math.round(task.reward)))
      : Math.min(150, Math.max(20, Math.round(task.reward / 2)));
    const newTask: CoinTask = { ...task, reward: task.kind === "physical" ? 0 : task.reward, id: Date.now(), doneToday: false, icon: task.name.trim().charAt(0).toUpperCase() || "+", xp: calculatedXp };
    const addToList = (tasks: CoinTask[]) => [newTask, ...tasks.map((item) => task.priority === "main" && item.priority === "main" ? { ...item, priority: "optional" as const } : item)];
    if (task.kind === "physical") setPhysicalTasks(addToList); else setWorkTasks(addToList);
    showToast(`Quest added · ${calculatedXp} XP`, task.kind === "physical" ? "calorie" : "money");
  };

  const addFood = (food: Omit<FoodEntry, "id" | "time">) => {
    const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date());
    setFoodEntries((entries) => [{ ...food, id: Date.now(), time, loggedOn: localDateKey(new Date()), eaten: food.eaten !== false }, ...entries]);
    showToast(`−${food.calories} calories from Fuel budget`, "calorie");
  };
  const removeFood = (id: number) => setFoodEntries((entries) => entries.filter((entry) => entry.id !== id));
  const toggleFoodEaten = (id: number) => {
    const entry = foodEntries.find((item) => item.id === id);
    if (!entry) return;
    const nextEaten = entry.eaten === false;
    setFoodEntries((entries) => entries.map((item) => item.id === id ? { ...item, eaten: nextEaten } : item));
    showToast(nextEaten ? "Plate marked eaten · calories stay counted" : "Plate marked not eaten yet · calories stay counted", "calorie");
  };
  const saveFood = (food: UsdaFood) => {
    setSavedFoods((foods) => {
      const source = food.source || "Joelix";
      const savedFood = { ...food, source, savedOn: localDateKey(new Date()) };
      const withoutPrevious = foods.filter((item) => !(item.fdcId === food.fdcId && (item.source || "Joelix") === source));
      return [savedFood, ...withoutPrevious];
    });
    showToast("Food saved to Joelix", "money");
  };
  const removeSavedFood = (fdcId: number, source?: string) => {
    setSavedFoods((foods) => foods.filter((food) => !(food.fdcId === fdcId && (food.source || "Joelix") === (source || "Joelix"))));
  };

  const addSpend = (name: string, amount: number, category: string) => {
    const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date());
    setSpendEntries((entries) => [{ id: Date.now(), name, amount, category, date }, ...entries]);
    showToast(`−$${amount.toFixed(0)} buyable coins`, "spend");
  };

  const addDebt = (creditor: string, amount: number) => {
    if (!creditor.trim() || !Number.isFinite(amount) || amount <= 0) return;
    const debt: DebtEntry = {
      id: Date.now(),
      creditor: creditor.trim(),
      amount,
      remaining: amount,
      createdOn: new Date().toISOString().slice(0, 10),
      status: "active",
    };
    setDebts((current) => [debt, ...current]);
    showToast(`Debt alert · $${amount.toFixed(0)} owed to ${debt.creditor}`, "spend");
  };

  const recordDebtPayment = (id: number, amount: number) => {
    const debt = debts.find((entry) => entry.id === id && entry.status === "active");
    if (!debt || !Number.isFinite(amount) || amount <= 0) return;
    const payment = Math.min(amount, debt.remaining);
    const nextRemaining = Math.max(0, debt.remaining - payment);
    setDebts((current) => current.map((entry) => entry.id === id ? {
      ...entry,
      remaining: nextRemaining,
      status: nextRemaining === 0 ? "paid" : "active",
      paidOn: nextRemaining === 0 ? new Date().toISOString().slice(0, 10) : entry.paidOn,
    } : entry));
    showToast(nextRemaining === 0 ? `${debt.creditor} debt completed` : `$${payment.toFixed(0)} payment recorded`, "spend");
  };

  const completeDebt = (id: number) => {
    const debt = debts.find((entry) => entry.id === id && entry.status === "active");
    if (!debt) return;
    setDebts((current) => current.map((entry) => entry.id === id ? {
      ...entry,
      remaining: 0,
      status: "paid",
      paidOn: new Date().toISOString().slice(0, 10),
    } : entry));
    showToast(`${debt.creditor} paid in full · Money Coin unchanged`, "money");
  };

  const addWeight = async (weightKg: number) => {
    const entry = { id: Date.now(), weightKg, loggedOn: new Date().toISOString().slice(0, 10) };
    setWeights((items) => [entry, ...items]); showToast("Weight logged", "money"); await saveWellness({ action: "weight", weightKg });
  };
  const addMood = async (score: number, label: string, note: string) => {
    const entry = { id: Date.now(), score, label, note, loggedOn: new Date().toISOString().slice(0, 10) };
    setMoods((items) => [entry, ...items]); showToast("Feeling saved", "money"); await saveWellness({ action: "mood", score, label, note });
  };
  const changeAlarm = async (enabled: boolean, minutes: number) => {
    setAlarmEnabled(enabled); setAlarmMinutes(minutes); await saveWellness({ action: "alarm", enabled, minutes });
  };
  const saveProfile = async (nextDisplayName: string, nextPlayerTag: string, nextPrimaryGoal: string) => {
    const cleanName = nextDisplayName.trim().slice(0, 50);
    const cleanTag = nextPlayerTag.trim().replace(/^@+/, "").slice(0, 24);
    const cleanGoal = nextPrimaryGoal.trim().slice(0, 160);
    setDisplayName(cleanName); setPlayerTag(cleanTag); setPrimaryGoal(cleanGoal);
    await saveWellness({ action: "profile", displayName: cleanName, playerTag: cleanTag, primaryGoal: cleanGoal });
  };

  const addWhopContent = (content: Omit<WhopContentItem, "id" | "createdOn" | "claimed">) => {
    const createdOn = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date());
    setWhopContent((items) => [{ ...content, id: Date.now(), createdOn, claimed: false }, ...items]);
    showToast("Content tracker added", "money");
  };
  const updateWhopViews = (id: number, views: number) => {
    const safeViews = Math.max(0, Math.min(1_000_000_000, Math.round(Number(views) || 0)));
    setWhopContent((items) => items.map((item) => item.id === id ? { ...item, views: safeViews } : item));
    showToast("View count updated", "money");
  };
  const removeWhopContent = (id: number) => setWhopContent((items) => items.filter((item) => item.id !== id));
  const toggleWhopClaimed = (id: number) => setWhopContent((items) => items.map((item) => item.id === id ? { ...item, claimed: !item.claimed } : item));
  const changeWhopRate = (platform: ContentPlatform, rate: number) => {
    const safeRate = Math.max(0, Math.min(100_000, Number(rate) || 0));
    setWhopRates((current) => ({ ...current, [platform]: safeRate }));
  };

  const resetGame = async () => {
    const freshPhysicalTasks = physicalSeed.map((task) => ({ ...task, doneToday: false }));
    const freshWorkTasks = workSeed.map((task) => ({ ...task, doneToday: false }));

    setPhysicalTasks(freshPhysicalTasks);
    setWorkTasks(freshWorkTasks);
    setFoodEntries([]);
    setSavedFoods([]);
    setFuelState(defaultFuelState());
    setMoneyBalance(0);
    setDebts([]);
    setTodayMoneyEarned(0);
    setSpendEntries([]);
    setTasksCompletedToday(0);
    setHistoryStats(emptyHistory());
    setXp(0);
    setDisplayName("");
    setPlayerTag("");
    setPrimaryGoal("");
    setWeights([]);
    setMoods([]);
    setAlarmEnabled(false);
    setAlarmMinutes(60);
    setDayKey(new Date().toDateString());
    setCalorieCycleKey(calorieCycleFor(new Date().toDateString()).key);
    setBonusDone({ physical: [], work: [] });
    setWhopContent([]);
    setWhopRates(defaultWhopRates);
    setYoutubeState(null);
    setTodoPlanner(defaultTodoPlanner());

    const [wellnessResult, wishlistResult, youtubeImagesResult] = await Promise.allSettled([
      fetch("/api/wellness", { method: "DELETE" }),
      fetch("/api/wishlist?all=1", { method: "DELETE" }),
      fetch("/api/youtube-images?all=1", { method: "DELETE" }),
    ]);
    const cloudReset = wellnessResult.status === "fulfilled" && wellnessResult.value.ok
      && wishlistResult.status === "fulfilled" && wishlistResult.value.ok
      && youtubeImagesResult.status === "fulfilled" && youtubeImagesResult.value.ok;
    setResetSignal((value) => value + 1);
    setCloudReady(cloudReset);
    showToast(cloudReset ? "Game data reset" : "Session reset · cloud unavailable", "spend");
  };

  const goTo = (screen: Screen, nextTaskTab?: TaskKind) => { if (nextTaskTab) setTaskTab(nextTaskTab); setActiveScreen(screen); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const installApp = async () => {
    if (isInstalled) { showToast("Joelix is already installed", "money"); return; }
    if (installPrompt) { await installPrompt.prompt(); const choice = await installPrompt.userChoice; if (choice.outcome === "accepted") setIsInstalled(true); setInstallPrompt(null); window.__joelixInstallPrompt = null; return; }
    setShowInstallHelp(true);
  };

  return (
    <div className={`app-shell pixel-game ${activeScreen === "store" ? "store-active" : ""} ${activeScreen === "ideas" ? "ideas-active" : ""} ${activeScreen === "food" ? "food-active" : ""} ${activeScreen === "workout" ? "workout-active" : ""} ${activeScreen === "whop" ? "whop-active" : ""} ${activeScreen === "todo" ? "todo-active" : ""} ${activeScreen === "home" ? "home-active" : ""}`}>
      <aside className={`desktop-sidebar ${sidebarPinned ? "pinned" : ""}`} aria-label="Primary navigation">
        <button className="brand brand-button" onClick={() => goTo("home")} aria-label="Joelix Video Game home"><span className="brand-mark" aria-hidden="true"><span>J</span><span>X</span><span>3</span></span><span className="brand-copy"><strong>Joelix Video Game</strong><small>Life quest RPG</small></span></button>
        <nav className="side-nav">{navItems.map((item) => <button key={item.id} data-screen={item.id} className={activeScreen === item.id ? "active" : ""} onClick={() => goTo(item.id)} aria-current={activeScreen === item.id ? "page" : undefined}><span className="nav-icon" aria-hidden="true"><b>{item.icon}</b></span>{item.label}</button>)}</nav>
        <button className="install-sidebar-button" onClick={installApp}><span aria-hidden="true">↓</span><span><strong>{isInstalled ? "Game installed" : installPrompt ? "Install Joelix now" : "Install Joelix"}</strong><small>{installPrompt ? "Ready for this PC" : "Desktop & mobile"}</small></span></button>
        <div className="sidebar-note"><span className="eyebrow">Game rule</span><p>Move. Earn. Unlock.</p></div>
        <button type="button" className="desktop-sidebar-handle" onClick={() => setSidebarPinned((pinned) => !pinned)} aria-expanded={sidebarPinned} aria-label={sidebarPinned ? "Hide and unpin navigation" : "Show and pin navigation"}>
          <span aria-hidden="true">☰</span><small>{sidebarPinned ? "Hide" : "Menu"}</small>
        </button>
      </aside>

      <main className="main-content">
        <div className="mobile-header"><button className="brand brand-button" onClick={() => goTo("home")} aria-label="Joelix Video Game home"><span className="brand-mark" aria-hidden="true"><span>J</span><span>X</span><span>3</span></span><span className="brand-copy"><strong>Joelix</strong><small>Video Game</small></span></button><div className="mobile-header-actions"><button className={`mobile-install-button ${installPrompt ? "ready" : ""}`} onClick={installApp}><span aria-hidden="true">{isInstalled ? "✓" : "↓"}</span><small>{isInstalled ? "Installed" : installPrompt ? "Install now" : "Install"}</small></button><button className="avatar" onClick={() => goTo("player")} aria-label="Open profile">{avatarInitials}</button></div></div>

        {activeScreen === "home" && <Dashboard calorieBalance={calorieBalance} calorieTarget={fuelState.targets.calories} caloriesEaten={caloriesEaten} fuelServiceDate={fuelServiceDate} moneyBalance={moneyBalance} debtBalance={debtBalance} debtFor={debtFor} debtCount={activeDebts.length} todayMoneyEarned={todayMoneyEarned} buyableAllowance={buyableAllowance} buyableAvailable={buyableAvailable} charityAllowance={charityAllowance} protectedMoney={protectedMoney} spentThisMonth={spentThisMonth} tasksCompletedToday={tasksCompletedToday} xp={xp} physicalTasks={physicalTasks} workTasks={workTasks} onNavigate={goTo} onComplete={completeTask} />}
        {activeScreen === "tasks" && <TaskList activeTab={taskTab} onTabChange={setTaskTab} physicalTasks={physicalTasks} workTasks={workTasks} bonusTasks={taskTab === "physical" ? physicalBonuses : workBonuses} onComplete={completeTask} onAddTask={addTask} />}
        {activeScreen === "todo" && <TodoPlanner state={todoPlanner} onChange={setTodoPlanner} />}
        <div hidden={activeScreen !== "workout"}><WorkoutTracker key={resetSignal} /></div>
        <div hidden={activeScreen !== "youtube"}><YouTubeContent key={resetSignal} savedState={youtubeState} storageReady={gameStateLoaded} onStateChange={saveYouTubeState} /></div>
        {activeScreen === "whop" && <WhopRewards items={whopContent} rates={whopRates} onAdd={addWhopContent} onUpdateViews={updateWhopViews} onRemove={removeWhopContent} onToggleClaimed={toggleWhopClaimed} onRateChange={changeWhopRate} />}
        <div hidden={activeScreen !== "ideas"}><IdeasVault /></div>
        {activeScreen === "food" && <FoodLog state={fuelState} savedFoods={savedFoods} onStateChange={setFuelState} onSaveFood={saveFood} onRemoveSavedFood={removeSavedFood} />}
        {activeScreen === "player" && <PlayerHub displayName={displayName} playerTag={playerTag} primaryGoal={primaryGoal} xp={xp} weights={weights} moods={moods} alarmEnabled={alarmEnabled} alarmMinutes={alarmMinutes} cloudReady={cloudReady} onProfileChange={(patch) => { if (patch.displayName !== undefined) setDisplayName(patch.displayName); if (patch.playerTag !== undefined) setPlayerTag(patch.playerTag); if (patch.primaryGoal !== undefined) setPrimaryGoal(patch.primaryGoal); }} onSaveProfile={saveProfile} onAddWeight={addWeight} onAddMood={addMood} onAlarmChange={changeAlarm} onResetGame={resetGame} />}
        {activeScreen === "coach" && <Coach />}
        {activeScreen === "store" && <BuyableStore moneyBalance={moneyBalance} debts={debts} allowance={buyableAllowance} available={buyableAvailable} spentThisMonth={spentThisMonth} entries={spendEntries} onAddSpend={addSpend} onAddDebt={addDebt} onRecordDebtPayment={recordDebtPayment} onCompleteDebt={completeDebt} />}
        {activeScreen === "history" && <HistoryCharts todayCalorieBalance={calorieBalance} todayMoneyEarned={todayMoneyEarned} tasksCompletedToday={tasksCompletedToday} history={historyStats} />}
      </main>

      <nav className="mobile-nav" aria-label="Primary navigation">{navItems.filter((item) => item.mobile).map((item) => <button key={item.id} data-screen={item.id} className={activeScreen === item.id ? "active" : ""} onClick={() => goTo(item.id)} aria-current={activeScreen === item.id ? "page" : undefined}><span className="nav-icon" aria-hidden="true"><b>{item.icon}</b></span><small>{item.label}</small></button>)}</nav>
      <FloatingCoach onOpenFull={() => goTo("coach")} />
      {toast && <div className={`coin-toast ${toast.tone}`} role="status">{toast.text}</div>}

      {showInstallHelp && <div className="install-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowInstallHelp(false)}><section className="install-dialog" role="dialog" aria-modal="true" aria-labelledby="install-title"><button className="install-close" onClick={() => setShowInstallHelp(false)} aria-label="Close install instructions">×</button><Image src="/app-icon-192.png" alt="Joelix Video Game app icon" width={76} height={76} unoptimized /><span className="eyebrow">Take it with you</span><h2 id="install-title">Install Joelix</h2><p>It opens full-screen from your home screen or desktop, just like an app.</p><div className="install-steps"><article><b>iPhone & iPad</b><span>Open in Safari, tap <strong>Share</strong>, then choose <strong>Add to Home Screen</strong>.</span></article><article><b>Android</b><span>Open the browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span></article><article><b>PC & Mac</b><span>Open this site in Chrome or Edge, then use the <strong>Install app</strong> icon in the address bar. If hidden, open the browser menu and choose <strong>Apps → Install Joelix Video Game</strong>.</span></article></div><button className="primary-button full" onClick={() => setShowInstallHelp(false)}>Got it</button></section></div>}
    </div>
  );
}
