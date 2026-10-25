"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ExerciseMode = "Strength" | "Cardio" | "Mobility";

type WorkoutSet = {
  id: number;
  reps: number;
  weight: number;
  minutes: number;
  distance: number;
  done: boolean;
};

type Exercise = {
  id: number;
  name: string;
  mode: ExerciseMode;
  note: string;
  sets: WorkoutSet[];
};

type SavedWorkout = {
  id: number;
  name: string;
  date: string;
  duration: number;
  completedSets: number;
  volume: number;
  prs?: number;
  complete?: boolean;
};

type PerformanceRecord = {
  reps: number;
  weight: number;
  bestReps: number;
  bestWeight: number;
};

type WorkoutState = {
  sessionName?: string;
  exercises?: Exercise[];
  elapsedSeconds?: number;
  restTarget?: number;
  customRestSeconds?: number;
  sessionNote?: string;
  savedCurrent?: boolean;
  performanceHistory?: Record<string, PerformanceRecord>;
  prCount?: number;
  history?: SavedWorkout[];
};

type Template = {
  name: string;
  focus: string;
  exercises: Array<{ name: string; mode: ExerciseMode; sets: number; reps?: number; weight?: number; minutes?: number; distance?: number }>;
};

const templates: Template[] = [
  {
    name: "Shoulders + Arms",
    focus: "Delts · Biceps · Triceps",
    exercises: [
      { name: "Seated shoulder press", mode: "Strength", sets: 4, reps: 8, weight: 18 },
      { name: "Lateral raise", mode: "Strength", sets: 4, reps: 12, weight: 7 },
      { name: "EZ-bar curl", mode: "Strength", sets: 3, reps: 10, weight: 20 },
      { name: "Triceps pushdown", mode: "Strength", sets: 3, reps: 12, weight: 22 },
      { name: "Hammer curl", mode: "Strength", sets: 3, reps: 10, weight: 10 },
    ],
  },
  {
    name: "Leg 1",
    focus: "Quads · Strength",
    exercises: [
      { name: "Back squat", mode: "Strength", sets: 4, reps: 8, weight: 45 },
      { name: "Leg press", mode: "Strength", sets: 4, reps: 10, weight: 80 },
      { name: "Leg extension", mode: "Strength", sets: 3, reps: 12, weight: 30 },
      { name: "Walking lunge", mode: "Strength", sets: 3, reps: 10, weight: 12 },
      { name: "Standing calf raise", mode: "Strength", sets: 4, reps: 15, weight: 35 },
    ],
  },
  {
    name: "Chest + Back",
    focus: "Upper torso · Balance",
    exercises: [
      { name: "Bench press", mode: "Strength", sets: 4, reps: 8, weight: 35 },
      { name: "Lat pulldown", mode: "Strength", sets: 4, reps: 10, weight: 35 },
      { name: "Incline dumbbell press", mode: "Strength", sets: 3, reps: 10, weight: 16 },
      { name: "Seated cable row", mode: "Strength", sets: 3, reps: 10, weight: 35 },
      { name: "Cable fly", mode: "Strength", sets: 3, reps: 12, weight: 12 },
    ],
  },
  {
    name: "Leg 2",
    focus: "Glutes · Hamstrings",
    exercises: [
      { name: "Romanian deadlift", mode: "Strength", sets: 4, reps: 8, weight: 45 },
      { name: "Hip thrust", mode: "Strength", sets: 4, reps: 10, weight: 55 },
      { name: "Hamstring curl", mode: "Strength", sets: 3, reps: 12, weight: 25 },
      { name: "Bulgarian split squat", mode: "Strength", sets: 3, reps: 10, weight: 12 },
      { name: "Seated calf raise", mode: "Strength", sets: 4, reps: 15, weight: 25 },
    ],
  },
  {
    name: "Push",
    focus: "Chest · Delts · Triceps",
    exercises: [
      { name: "Bench press", mode: "Strength", sets: 4, reps: 8, weight: 35 },
      { name: "Overhead press", mode: "Strength", sets: 4, reps: 8, weight: 22 },
      { name: "Incline dumbbell press", mode: "Strength", sets: 3, reps: 10, weight: 16 },
      { name: "Lateral raise", mode: "Strength", sets: 3, reps: 12, weight: 7 },
      { name: "Triceps pushdown", mode: "Strength", sets: 3, reps: 12, weight: 22 },
    ],
  },
  {
    name: "Pull",
    focus: "Back · Rear delts · Biceps",
    exercises: [
      { name: "Lat pulldown", mode: "Strength", sets: 4, reps: 10, weight: 35 },
      { name: "Barbell row", mode: "Strength", sets: 4, reps: 8, weight: 35 },
      { name: "Seated cable row", mode: "Strength", sets: 3, reps: 10, weight: 35 },
      { name: "Face pull", mode: "Strength", sets: 3, reps: 15, weight: 16 },
      { name: "EZ-bar curl", mode: "Strength", sets: 3, reps: 10, weight: 20 },
    ],
  },
];

function makeSet(seed: Partial<WorkoutSet> = {}, id = Date.now()): WorkoutSet {
  return { id, reps: 10, weight: 0, minutes: 5, distance: 0, done: false, ...seed };
}

function exercisesFromTemplate(template: Template, base = Date.now()): Exercise[] {
  return template.exercises.map((exercise, exerciseIndex) => ({
    id: base + exerciseIndex * 100,
    name: exercise.name,
    mode: exercise.mode,
    note: "",
    sets: Array.from({ length: exercise.sets }, (_, setIndex) => makeSet({
      reps: exercise.reps ?? 10,
      weight: exercise.weight ?? 0,
      minutes: exercise.minutes ?? 5,
      distance: exercise.distance ?? 0,
    }, base + exerciseIndex * 100 + setIndex + 1)),
  }));
}

const seedExercises = exercisesFromTemplate(templates[0], 1000);

const performanceKey = (exerciseName: string, setIndex: number) => `${exerciseName.trim().toLowerCase()}::${setIndex}`;

const padTime = (value: number) => String(value).padStart(2, "0");
const formatTime = (seconds: number) => `${padTime(Math.floor(seconds / 60))}:${padTime(seconds % 60)}`;

export function WorkoutTracker() {
  const [sessionName, setSessionName] = useState("Today’s training quest");
  const [exercises, setExercises] = useState<Exercise[]>(seedExercises);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [restTarget, setRestTarget] = useState(60);
  const [restSeconds, setRestSeconds] = useState(0);
  const [customRestSeconds, setCustomRestSeconds] = useState(120);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseMode, setNewExerciseMode] = useState<ExerciseMode>("Strength");
  const [sessionNote, setSessionNote] = useState("");
  const [savedCurrent, setSavedCurrent] = useState(false);
  const [performanceHistory, setPerformanceHistory] = useState<Record<string, PerformanceRecord>>({});
  const [prCount, setPrCount] = useState(0);
  const [history, setHistory] = useState<SavedWorkout[]>([]);
  const [workoutStateLoaded, setWorkoutStateLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/wellness").then(async (response) => {
      const data = await response.json() as { workoutState?: WorkoutState };
      if (!response.ok) return;
      const saved = data.workoutState;
      if (saved) {
        if (typeof saved.sessionName === "string") setSessionName(saved.sessionName);
        if (Array.isArray(saved.exercises)) setExercises(saved.exercises);
        if (Number.isFinite(saved.elapsedSeconds)) setElapsedSeconds(Math.max(0, saved.elapsedSeconds!));
        if (Number.isFinite(saved.restTarget)) setRestTarget(Math.max(5, saved.restTarget!));
        if (Number.isFinite(saved.customRestSeconds)) setCustomRestSeconds(Math.max(5, saved.customRestSeconds!));
        if (typeof saved.sessionNote === "string") setSessionNote(saved.sessionNote);
        if (typeof saved.savedCurrent === "boolean") setSavedCurrent(saved.savedCurrent);
        if (saved.performanceHistory && typeof saved.performanceHistory === "object") setPerformanceHistory(saved.performanceHistory);
        if (Number.isFinite(saved.prCount)) setPrCount(Math.max(0, saved.prCount!));
        if (Array.isArray(saved.history)) setHistory(saved.history);
      }
      setWorkoutStateLoaded(true);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!workoutStateLoaded) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/wellness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "workout_state",
          workoutState: { sessionName, exercises, elapsedSeconds, restTarget, customRestSeconds, sessionNote, savedCurrent, performanceHistory, prCount, history },
        }),
      }).catch(() => undefined);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [workoutStateLoaded, sessionName, exercises, elapsedSeconds, restTarget, customRestSeconds, sessionNote, savedCurrent, performanceHistory, prCount, history]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (restSeconds <= 0) return;
    const timer = window.setInterval(() => setRestSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [restSeconds]);

  const totals = useMemo(() => {
    const allSets = exercises.flatMap((exercise) => exercise.sets.map((set) => ({ ...set, mode: exercise.mode })));
    const done = allSets.filter((set) => set.done);
    return {
      allSets: allSets.length,
      completedSets: done.length,
      volume: Math.round(done.filter((set) => set.mode === "Strength").reduce((total, set) => total + set.reps * set.weight, 0)),
      cardioMinutes: done.filter((set) => set.mode !== "Strength").reduce((total, set) => total + set.minutes, 0),
    };
  }, [exercises]);

  const progress = totals.allSets ? Math.round((totals.completedSets / totals.allSets) * 100) : 0;
  const sessionTimeParts = {
    hours: padTime(Math.floor(elapsedSeconds / 3600)),
    minutes: padTime(Math.floor((elapsedSeconds % 3600) / 60)),
    seconds: padTime(elapsedSeconds % 60),
  };

  const getPreviousPerformance = (exerciseName: string, setIndex: number) => performanceHistory[performanceKey(exerciseName, setIndex)];
  const isSetPersonalRecord = (exercise: Exercise, set: WorkoutSet, setIndex: number) => {
    if (exercise.mode !== "Strength" || !set.done) return false;
    const previous = getPreviousPerformance(exercise.name, setIndex);
    return !previous || set.weight > previous.bestWeight || (set.weight === previous.bestWeight && set.reps > previous.bestReps);
  };

  const livePersonalRecords = exercises.reduce((count, exercise) => count + exercise.sets.filter((set, setIndex) => isSetPersonalRecord(exercise, set, setIndex)).length, 0);
  const savedSets = history.reduce((sum, workout) => sum + workout.completedSets, 0);
  const savedVolume = history.reduce((sum, workout) => sum + workout.volume, 0);
  const lifetimeSets = savedSets + (savedCurrent ? 0 : totals.completedSets);
  const lifetimeVolume = savedVolume + (savedCurrent ? 0 : totals.volume);
  const totalPersonalRecords = prCount + livePersonalRecords;
  const comparisonWorkout = savedCurrent ? history[1] : history[0];
  const previousVolume = comparisonWorkout?.volume ?? 0;
  const volumeComparison = previousVolume ? Math.round((totals.volume / previousVolume) * 100) : 0;
  const volumeDelta = totals.volume - previousVolume;
  const savedWorkoutCount = history.length;
  const perfectWorkoutCount = history.filter((workout) => workout.complete).length + (!savedCurrent && progress === 100 && totals.allSets > 0 ? 1 : 0);
  const longWorkoutCount = history.filter((workout) => workout.duration >= 1800).length + (!savedCurrent && elapsedSeconds >= 1800 ? 1 : 0);
  const hourWorkoutCount = history.filter((workout) => workout.duration >= 3600).length + (!savedCurrent && elapsedSeconds >= 3600 ? 1 : 0);
  const highVolumeWorkoutCount = history.filter((workout) => workout.volume >= 5000).length + (!savedCurrent && totals.volume >= 5000 ? 1 : 0);
  const prWorkoutCount = history.filter((workout) => (workout.prs ?? 0) > 0).length + (!savedCurrent && livePersonalRecords > 0 ? 1 : 0);
  const repeatableProgress = (value: number, target: number, unit: string) => {
    const count = Math.floor(value / target);
    const towardNext = value % target;
    return { count, progress: Math.round((towardNext / target) * 100), next: `${towardNext.toLocaleString("en-US")}/${target.toLocaleString("en-US")} ${unit}` };
  };
  const achievements = [
    { icon: "PR", name: "PR Hunter", detail: "Every personal record", ...repeatableProgress(totalPersonalRecords, 1, "PR to next") },
    { icon: "5PR", name: "PR Legend", detail: "Every 5 personal records", ...repeatableProgress(totalPersonalRecords, 5, "PR to next") },
    { icon: "1K", name: "Tonne Mover", detail: "Every 1,000 kg lifted", ...repeatableProgress(lifetimeVolume, 1000, "kg to next") },
    { icon: "5K", name: "Iron Engine", detail: "Every 5,000 kg lifted", ...repeatableProgress(lifetimeVolume, 5000, "kg to next") },
    { icon: "10", name: "Set Machine", detail: "Every 10 completed sets", ...repeatableProgress(lifetimeSets, 10, "sets to next") },
    { icon: "100", name: "Set Centurion", detail: "Every 100 completed sets", ...repeatableProgress(lifetimeSets, 100, "sets to next") },
    { icon: "LOG", name: "Quest Finisher", detail: "Every saved workout", ...repeatableProgress(savedWorkoutCount, 1, "workout to next") },
    { icon: "5X", name: "Consistency Loop", detail: "Every 5 saved workouts", ...repeatableProgress(savedWorkoutCount, 5, "workouts to next") },
    { icon: "✓", name: "Perfect Clear", detail: "Every 100% workout", ...repeatableProgress(perfectWorkoutCount, 1, "clear to next") },
    { icon: "30M", name: "Long Haul", detail: "Every 30+ minute workout", ...repeatableProgress(longWorkoutCount, 1, "session to next") },
    { icon: "60M", name: "Hour Hero", detail: "Every 60+ minute workout", ...repeatableProgress(hourWorkoutCount, 1, "session to next") },
    { icon: "HVY", name: "Heavy Session", detail: "Every 5,000 kg workout", ...repeatableProgress(highVolumeWorkoutCount, 1, "session to next") },
    { icon: "+PR", name: "PR Workout", detail: "Every workout with a PR", ...repeatableProgress(prWorkoutCount, 1, "workout to next") },
  ];
  const totalAchievementWins = achievements.reduce((sum, achievement) => sum + achievement.count, 0);
  const achievementLevel = Math.floor(totalAchievementWins / 10) + 1;

  const startRest = (seconds: number) => {
    const safeSeconds = Math.min(900, Math.max(5, Math.round(seconds)));
    setRestTarget(safeSeconds);
    setRestSeconds(safeSeconds);
  };

  const updateExercise = (id: number, patch: Partial<Exercise>) => {
    setExercises((items) => items.map((exercise) => exercise.id === id ? { ...exercise, ...patch } : exercise));
    setSavedCurrent(false);
  };

  const updateSet = (exerciseId: number, setId: number, patch: Partial<WorkoutSet>) => {
    setExercises((items) => items.map((exercise) => exercise.id === exerciseId ? {
      ...exercise,
      sets: exercise.sets.map((set) => set.id === setId ? { ...set, ...patch } : set),
    } : exercise));
    setSavedCurrent(false);
  };

  const toggleSet = (exerciseId: number, setId: number) => {
    const current = exercises.find((exercise) => exercise.id === exerciseId)?.sets.find((set) => set.id === setId);
    if (current && !current.done) setRestSeconds(restTarget);
    updateSet(exerciseId, setId, { done: !current?.done });
  };

  const addSet = (exerciseId: number) => {
    setExercises((items) => items.map((exercise) => {
      if (exercise.id !== exerciseId) return exercise;
      const previous = exercise.sets.at(-1);
      return { ...exercise, sets: [...exercise.sets, makeSet(previous ? { reps: previous.reps, weight: previous.weight, minutes: previous.minutes, distance: previous.distance } : {}, Date.now())] };
    }));
    setSavedCurrent(false);
  };

  const removeSet = (exerciseId: number, setId: number) => {
    setExercises((items) => items.map((exercise) => exercise.id === exerciseId ? { ...exercise, sets: exercise.sets.filter((set) => set.id !== setId) } : exercise));
    setSavedCurrent(false);
  };

  const addExercise = (event: FormEvent) => {
    event.preventDefault();
    if (!newExerciseName.trim()) return;
    const id = Date.now();
    setExercises((items) => [...items, {
      id,
      name: newExerciseName.trim(),
      mode: newExerciseMode,
      note: "",
      sets: [makeSet({}, id + 1), makeSet({}, id + 2), makeSet({}, id + 3)],
    }]);
    setNewExerciseName("");
    setSavedCurrent(false);
  };

  const loadTemplate = (template: Template) => {
    setExercises(exercisesFromTemplate(template));
    setSessionName(`${template.name} quest`);
    setElapsedSeconds(0);
    setRestSeconds(0);
    setRunning(false);
    setSavedCurrent(false);
  };

  const resetSession = () => {
    setExercises((items) => items.map((exercise) => ({ ...exercise, sets: exercise.sets.map((set) => ({ ...set, done: false })) })));
    setElapsedSeconds(0);
    setRestSeconds(0);
    setRunning(false);
    setSavedCurrent(false);
  };

  const saveSession = () => {
    if (!totals.completedSets || savedCurrent) return;
    const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date());
    const nextPerformance = { ...performanceHistory };
    exercises.forEach((exercise) => {
      if (exercise.mode !== "Strength") return;
      exercise.sets.forEach((set, setIndex) => {
        if (!set.done) return;
        const key = performanceKey(exercise.name, setIndex);
        const previous = nextPerformance[key];
        nextPerformance[key] = {
          reps: set.reps,
          weight: set.weight,
          bestReps: Math.max(previous?.bestReps ?? 0, set.reps),
          bestWeight: Math.max(previous?.bestWeight ?? 0, set.weight),
        };
      });
    });
    setPerformanceHistory(nextPerformance);
    setPrCount((count) => count + livePersonalRecords);
    setHistory((items) => [{ id: Date.now(), name: sessionName.trim() || "Workout quest", date, duration: elapsedSeconds, completedSets: totals.completedSets, volume: totals.volume, prs: livePersonalRecords, complete: progress === 100 }, ...items]);
    setRunning(false);
    setSavedCurrent(true);
  };

  return (
    <div className="screen workout-screen">
      <header className="workout-hero">
        <div className="workout-hero-copy">
          <span className="eyebrow">Joelix Iron House · Training floor open</span>
          <h1><span>Iron</span> Workout</h1>
          <p>Walk in focused. Track every set, rep, kilogram, interval, and rest period—then leave stronger than you arrived.</p>
          <div className="gym-hero-tags" aria-label="Gym motivation">
            <span>No excuses</span><span>Earn your strength</span><span>One more rep</span>
          </div>
          <label><span>Workout name</span><input value={sessionName} onChange={(event) => { setSessionName(event.target.value); setSavedCurrent(false); }} maxLength={70} /></label>
        </div>
        <div className={`workout-clock ${running ? "running" : ""}`}>
          <div className={`workout-motion-stage ${running ? "is-training" : restSeconds ? "is-resting" : "is-ready"}`} aria-hidden="true">
            <div className="biceps-arm">
              <span className="biceps-arm-art" />
            </div>
            <div className="workout-motion-sparks"><i /><i /><i /></div>
            <span className="workout-motion-label">{running ? "BICEPS FLEX!" : restSeconds ? "RELAX!" : "READY TO FLEX!"}</span>
          </div>
          <div className="session-console-head">
            <span>SESSION TIME</span>
            <i className={running ? "live" : elapsedSeconds ? "paused" : "ready"}><b />{running ? "LIVE" : elapsedSeconds ? "PAUSED" : "READY"}</i>
          </div>
          <div className="session-time-display" role="timer" aria-label={`Session time ${sessionTimeParts.hours} hours ${sessionTimeParts.minutes} minutes ${sessionTimeParts.seconds} seconds`}>
            <span className="session-time-unit"><b>{sessionTimeParts.hours}</b><small>HRS</small></span>
            <em>:</em>
            <span className="session-time-unit"><b>{sessionTimeParts.minutes}</b><small>MIN</small></span>
            <em>:</em>
            <span className="session-time-unit session-time-seconds"><b>{sessionTimeParts.seconds}</b><small>SEC</small></span>
          </div>
          <div className="session-controls">
            <button type="button" className="session-primary" onClick={() => setRunning((value) => !value)}><span aria-hidden="true">{running ? "Ⅱ" : "▶"}</span>{running ? "Pause session" : elapsedSeconds ? "Resume session" : "Start session"}</button>
            <button type="button" className="session-reset" onClick={resetSession}><span aria-hidden="true">↺</span>Reset</button>
          </div>
          <small className="session-status-copy">{running ? "Tracking every second · Stay focused" : elapsedSeconds ? "Timer paused · Your progress is safe" : "Console armed · Begin when ready"}</small>
        </div>
      </header>

      <section className="gym-motivation-wall" aria-label="Motivational gym wall">
        <div className="gym-wall-lead"><span>Mindset of the day</span><strong>The work starts now.</strong></div>
        <div className="gym-wall-words">
          <span>Show up</span><span>Stay hungry</span><span>Push harder</span><span>Be consistent</span><span>Finish strong</span><span>Built, not given</span>
        </div>
      </section>

      <section className="workout-hud" aria-label="Workout totals">
        <article><span>SET</span><small>Completed</small><strong>{totals.completedSets}/{totals.allSets}</strong></article>
        <article><span>KG</span><small>Volume lifted</small><strong>{totals.volume.toLocaleString("en-US")}</strong></article>
        <article><span>MIN</span><small>Cardio + mobility</small><strong>{totals.cardioMinutes}</strong></article>
        <article><span>%</span><small>Quest progress</small><strong>{progress}%</strong></article>
      </section>

      <section className="workout-progress-panel">
        <div><span><small>Session completion</small><strong>{progress}%</strong></span><div><i style={{ width: `${progress}%` }} /></div></div>
        <button type="button" onClick={saveSession} disabled={!totals.completedSets || savedCurrent}>{savedCurrent ? "✓ Workout saved" : "Finish + save workout"}</button>
      </section>

      <section className="gym-coach-callouts" aria-label="Gym motivation and coaching">
        <article><span>01</span><div><strong>Discipline wins</strong><p>Motivation gets you started. Consistency builds the result.</p></div></article>
        <article><span>02</span><div><strong>Own the next rep</strong><p>Do not chase perfect. Give the next set your full attention.</p></div></article>
        <article><span>03</span><div><strong>Stronger than yesterday</strong><p>Small progress, repeated often, becomes serious strength.</p></div></article>
      </section>

      <section className="workout-performance-center">
        <div className="performance-center-head">
          <div><span className="eyebrow">Player analytics</span><h2>Stats + progress</h2><p>Previous reps + weight appear below every strength set.</p></div>
          <span className="performance-rank">RANK // IRON</span>
        </div>
        <div className="performance-stat-grid">
          <article className="performance-stat pr-stat"><span>PR</span><div><small>Personal records</small><strong>{totalPersonalRecords}</strong>{livePersonalRecords > 0 && <b>+{livePersonalRecords} LIVE</b>}</div></article>
          <article className="performance-stat"><span>VOL</span><div><small>Lifetime volume</small><strong>{lifetimeVolume.toLocaleString("en-US")} <i>kg</i></strong></div></article>
          <article className="performance-stat"><span>SET</span><div><small>Sets completed</small><strong>{lifetimeSets}</strong></div></article>
          <article className="performance-stat"><span>LOG</span><div><small>Saved workouts</small><strong>{history.length}</strong></div></article>
        </div>
        <div className="performance-progress-card">
          <div className="performance-progress-copy">
            <span><small>Volume vs previous workout</small><strong>{totals.volume ? `${volumeComparison}%` : "READY"}</strong></span>
            <p>{totals.volume ? `${volumeDelta >= 0 ? "+" : ""}${volumeDelta.toLocaleString("en-US")} kg compared with ${comparisonWorkout?.name ?? "your last workout"}` : `Previous: ${comparisonWorkout?.name ?? "No saved workout"} · ${previousVolume.toLocaleString("en-US")} kg`}</p>
          </div>
          <div className="performance-progress-track"><i style={{ width: `${Math.min(100, volumeComparison)}%` }} /></div>
          <div className="performance-progress-labels"><span>0</span><span>Previous {previousVolume.toLocaleString("en-US")} kg</span></div>
        </div>
        <div className="achievement-section">
          <div className="achievement-title"><div><span>Trophy cabinet · Unlimited repeats</span><strong>Achievements</strong></div><div className="achievement-total"><b>∞ LEVEL {achievementLevel}</b><small>{totalAchievementWins} total earned</small></div></div>
          <div className="achievement-grid">
            {achievements.map((achievement) => <article className={achievement.count > 0 ? "unlocked" : "locked"} key={achievement.name}>
              <span>{achievement.icon}</span>
              <div><strong>{achievement.name}</strong><small>{achievement.detail}</small><i><b style={{ width: `${achievement.progress}%` }} /></i><small className="achievement-next">{achievement.next}</small></div>
              <em><b>×{achievement.count}</b><small>EARNED</small></em>
            </article>)}
          </div>
        </div>
      </section>

      <section className="workout-templates">
        <div className="section-title-row"><div><span className="eyebrow">Loadout select</span><h2>Workout templates</h2></div><small>Choosing a template replaces the current exercise list.</small></div>
        <div>{templates.map((template, index) => <button type="button" key={template.name} onClick={() => loadTemplate(template)}><b>{String(index + 1).padStart(2, "0")}</b><span><strong>{template.name}</strong><small>{template.focus}</small></span><i>LOAD</i></button>)}</div>
      </section>

      <div className="workout-workspace">
        <main className="exercise-log">
          <div className="workout-panel-title"><div><span className="workout-led" /><strong>Live exercise log</strong></div><small>{exercises.length} exercises</small></div>
          <div className="exercise-list">
            {exercises.map((exercise, exerciseIndex) => (
              <article className={`exercise-card mode-${exercise.mode.toLowerCase()}`} key={exercise.id}>
                <header>
                  <b>{String(exerciseIndex + 1).padStart(2, "0")}</b>
                  <div><input value={exercise.name} onChange={(event) => updateExercise(exercise.id, { name: event.target.value })} aria-label={`Exercise ${exerciseIndex + 1} name`} /><span>{exercise.mode}</span></div>
                  <button type="button" onClick={() => setExercises((items) => items.filter((item) => item.id !== exercise.id))} aria-label={`Remove ${exercise.name}`}>×</button>
                </header>

                <div className="set-table">
                  <div className="set-table-head"><span>Set</span>{exercise.mode === "Strength" ? <><span>Reps</span><span>Weight kg</span></> : <><span>Minutes</span><span>{exercise.mode === "Cardio" ? "Distance km" : "Rounds"}</span></>}<span>Done</span><span /></div>
                  {exercise.sets.map((set, setIndex) => (
                    <div className={`workout-set-row ${set.done ? "done" : ""} ${isSetPersonalRecord(exercise, set, setIndex) ? "is-pr" : ""}`} key={set.id}>
                      <b>{setIndex + 1}</b>
                      {isSetPersonalRecord(exercise, set, setIndex) && <span className="set-pr-flag">NEW PR</span>}
                      {exercise.mode === "Strength" ? <>
                        <label className="set-value-field"><input type="number" min="0" value={set.reps} onChange={(event) => updateSet(exercise.id, set.id, { reps: Math.max(0, Number(event.target.value)) })} aria-label={`${exercise.name} set ${setIndex + 1} reps`} /><small>Prev {getPreviousPerformance(exercise.name, setIndex)?.reps ?? "—"}</small></label>
                        <label className="set-value-field"><input type="number" min="0" step="0.5" value={set.weight} onChange={(event) => updateSet(exercise.id, set.id, { weight: Math.max(0, Number(event.target.value)) })} aria-label={`${exercise.name} set ${setIndex + 1} weight`} /><small>Prev {getPreviousPerformance(exercise.name, setIndex)?.weight ?? "—"} kg</small></label>
                      </> : <>
                        <input type="number" min="0" step="0.5" value={set.minutes} onChange={(event) => updateSet(exercise.id, set.id, { minutes: Math.max(0, Number(event.target.value)) })} aria-label={`${exercise.name} set ${setIndex + 1} minutes`} />
                        <input type="number" min="0" step="0.1" value={exercise.mode === "Cardio" ? set.distance : set.reps} onChange={(event) => updateSet(exercise.id, set.id, exercise.mode === "Cardio" ? { distance: Math.max(0, Number(event.target.value)) } : { reps: Math.max(0, Number(event.target.value)) })} aria-label={`${exercise.name} set ${setIndex + 1} ${exercise.mode === "Cardio" ? "distance" : "rounds"}`} />
                      </>}
                      <button type="button" className="set-complete" onClick={() => toggleSet(exercise.id, set.id)} aria-pressed={set.done} aria-label={`${set.done ? "Undo" : "Complete"} ${exercise.name} set ${setIndex + 1}`}>
                        <span className="set-check-mark" aria-hidden="true">✓</span>
                        <span className="set-check-burst" aria-hidden="true"><i /><i /><i /><i /></span>
                      </button>
                      <button type="button" className="set-remove" onClick={() => removeSet(exercise.id, set.id)} aria-label={`Remove ${exercise.name} set ${setIndex + 1}`}>×</button>
                    </div>
                  ))}
                </div>
                <div className="exercise-card-footer"><button type="button" onClick={() => addSet(exercise.id)}>+ Add set</button><input value={exercise.note} onChange={(event) => updateExercise(exercise.id, { note: event.target.value })} placeholder="Exercise note..." aria-label={`${exercise.name} note`} /></div>
              </article>
            ))}
            {!exercises.length && <div className="workout-empty"><strong>No exercises loaded</strong><p>Choose a template or add an exercise from the control deck.</p></div>}
          </div>
        </main>

        <aside className="workout-control-deck">
          <section className={`rest-timer ${restSeconds ? "active" : ""}`}>
            <span>REST TIMER</span>
            <strong>{formatTime(restSeconds)}</strong>
            <div className="rest-presets">{[30,60,90].map((seconds) => <button type="button" key={seconds} className={restTarget === seconds ? "selected" : ""} onClick={() => startRest(seconds)}>{seconds}s</button>)}</div>
            <div className="rest-custom">
              <label><span>Custom seconds</span><input type="number" min="5" max="900" step="5" value={customRestSeconds} onChange={(event) => setCustomRestSeconds(Math.min(900, Math.max(5, Number(event.target.value) || 5)))} /></label>
              <button type="button" onClick={() => startRest(customRestSeconds)}>Start custom</button>
            </div>
            <button type="button" className="skip-rest" onClick={() => setRestSeconds(0)}>Skip rest</button>
          </section>

          <section className="workout-side-card add-exercise-card">
            <div className="workout-side-title"><span>New move</span><strong>Add exercise</strong></div>
            <form onSubmit={addExercise}>
              <label><span>Name</span><input value={newExerciseName} onChange={(event) => setNewExerciseName(event.target.value)} placeholder="Exercise name" maxLength={60} /></label>
              <label><span>Tracking mode</span><select value={newExerciseMode} onChange={(event) => setNewExerciseMode(event.target.value as ExerciseMode)}><option>Strength</option><option>Cardio</option><option>Mobility</option></select></label>
              <button type="submit" disabled={!newExerciseName.trim()}>+ Add to workout</button>
            </form>
          </section>

          <section className="workout-side-card workout-notes-card">
            <div className="workout-side-title"><span>Coach log</span><strong>Session notes</strong></div>
            <textarea value={sessionNote} onChange={(event) => setSessionNote(event.target.value)} rows={5} placeholder="Energy, technique, pain, wins, or what to change next time..." />
          </section>

          <section className="workout-side-card workout-history-card">
            <div className="workout-side-title"><span>Memory cards</span><strong>Recent workouts</strong></div>
            <div>{history.slice(0,5).map((workout) => <article key={workout.id}><span>✓</span><div><strong>{workout.name}</strong><small>{workout.date} · {formatTime(workout.duration)} · {workout.completedSets} sets</small></div><b>{workout.volume ? `${workout.volume.toLocaleString("en-US")} kg${workout.prs ? ` · ${workout.prs} PR` : ""}` : "CARDIO"}</b></article>)}</div>
          </section>
        </aside>
      </div>

      <div className="gym-finisher-ribbon" aria-label="Final gym motivation"><span>Train hard</span><i>•</i><span>Rest smart</span><i>•</i><span>Return stronger</span><i>•</i><span>Never quit</span></div>

      <p className="screen-footnote">Stop if you feel sharp pain, chest pain, faintness, or unusual shortness of breath. Exercise records save with your Joelix profile.</p>
    </div>
  );
}
