"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { MoodEntry, WeightEntry } from "./types";

type Props = {
  displayName: string;
  playerTag: string;
  primaryGoal: string;
  xp: number;
  weights: WeightEntry[];
  moods: MoodEntry[];
  alarmEnabled: boolean;
  alarmMinutes: number;
  cloudReady: boolean;
  onProfileChange: (patch: { displayName?: string; playerTag?: string; primaryGoal?: string }) => void;
  onSaveProfile: (displayName: string, playerTag: string, primaryGoal: string) => Promise<void>;
  onAddWeight: (weightKg: number) => Promise<void>;
  onAddMood: (score: number, label: string, note: string) => Promise<void>;
  onAlarmChange: (enabled: boolean, minutes: number) => Promise<void>;
  onResetGame: () => Promise<void>;
};

const feelings = [
  { score: 1, emoji: "😞", label: "Rough" },
  { score: 2, emoji: "😕", label: "Low" },
  { score: 3, emoji: "😐", label: "Okay" },
  { score: 4, emoji: "🙂", label: "Good" },
  { score: 5, emoji: "😄", label: "Great" },
];

export function PlayerHub({ displayName, playerTag, primaryGoal, xp, weights, moods, alarmEnabled, alarmMinutes, cloudReady, onProfileChange, onSaveProfile, onAddWeight, onAddMood, onAlarmChange, onResetGame }: Props) {
  const [profileStatus, setProfileStatus] = useState("");
  const [weight, setWeight] = useState("");
  const [selectedMood, setSelectedMood] = useState(3);
  const [moodNote, setMoodNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [alarmStatus, setAlarmStatus] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const level = Math.min(100, Math.floor(xp / 100) + 1);
  const levelProgress = level === 100 ? 100 : xp % 100;
  const chart = useMemo(() => [...weights].slice(0, 10).reverse(), [weights]);
  const minWeight = chart.length > 0 ? Math.min(...chart.map((entry) => entry.weightKg)) : 0;
  const maxWeight = chart.length > 0 ? Math.max(...chart.map((entry) => entry.weightKg)) : 1;
  const avatarInitials = (displayName.trim() || playerTag.trim() || "Player One").split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();

  useEffect(() => {
    if (!alarmEnabled || !("Notification" in window)) return;
    const notify = async () => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const registration = await navigator.serviceWorker?.ready;
      if (registration) registration.showNotification("Joelix work quest", { body: "Time to complete one money-making task. +XP is waiting.", icon: "/app-icon-192.png", tag: "joelix-work" });
      else new Notification("Joelix work quest", { body: "Time to complete one money-making task." });
    };
    const timer = window.setInterval(notify, alarmMinutes * 60_000);
    return () => window.clearInterval(timer);
  }, [alarmEnabled, alarmMinutes]);

  const toggleAlarm = async () => {
    if (!alarmEnabled) {
      if (!("Notification" in window)) { setAlarmStatus("Notifications are not supported in this browser."); return; }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setAlarmStatus("Allow notifications in browser settings, then try again."); return; }
      setAlarmStatus(`Work reminders enabled every ${alarmMinutes} minutes.`);
      await onAlarmChange(true, alarmMinutes);
    } else {
      setAlarmStatus("Work reminders paused.");
      await onAlarmChange(false, alarmMinutes);
    }
  };

  const submitWeight = async (event: FormEvent) => {
    event.preventDefault(); const value = Number(weight); if (value < 25 || value > 400) return;
    setBusy(true); await onAddWeight(value); setWeight(""); setBusy(false);
  };

  const submitMood = async (event: FormEvent) => {
    event.preventDefault(); const feeling = feelings.find((item) => item.score === selectedMood)!;
    setBusy(true); await onAddMood(feeling.score, feeling.label, moodNote); setMoodNote(""); setBusy(false);
  };

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setProfileStatus("Saving...");
    await onSaveProfile(displayName, playerTag, primaryGoal);
    setProfileStatus("Profile saved");
    setBusy(false);
  };

  const resetGame = async () => {
    setBusy(true);
    await onResetGame();
    setWeight("");
    setSelectedMood(3);
    setMoodNote("");
    setProfileStatus("");
    setAlarmStatus("Game data reset. Welcome back to level 1.");
    setConfirmReset(false);
    setBusy(false);
  };

  return (
    <div className="screen player-screen">
      <header className="page-heading standard-heading"><div><span className="eyebrow">Player identity</span><h1>Profile</h1><p>Your Joelix identity, goal, body progress, feelings, and game controls.</p></div><span className={`cloud-badge ${cloudReady ? "ready" : ""}`}>{cloudReady ? "Saved on this device" : "Connecting save..."}</span></header>

      <section className="card profile-card">
        <div className="profile-avatar" aria-hidden="true"><span>{avatarInitials}</span><i /></div>
        <form className="profile-form" onSubmit={submitProfile}>
          <div className="profile-card-title"><div><span className="eyebrow">Create your player</span><h2>{displayName.trim() || "New player"}</h2></div>{playerTag.trim() && <strong>@{playerTag.trim().replace(/^@+/, "")}</strong>}</div>
          <div className="profile-field-grid">
            <label><span>Display name</span><input value={displayName} onChange={(event) => { onProfileChange({ displayName: event.target.value }); setProfileStatus(""); }} maxLength={50} placeholder="Your name" /></label>
            <label><span>Player tag</span><div className="tag-input"><b>@</b><input value={playerTag} onChange={(event) => { onProfileChange({ playerTag: event.target.value.replace(/^@+/, "") }); setProfileStatus(""); }} maxLength={24} placeholder="player_one" /></div></label>
          </div>
          <label className="profile-goal-field"><span>Main goal</span><textarea value={primaryGoal} onChange={(event) => { onProfileChange({ primaryGoal: event.target.value }); setProfileStatus(""); }} maxLength={160} rows={2} placeholder="What do you want Joelix to help you achieve?" /></label>
          <div className="profile-save-row"><button className="primary-button" disabled={busy}>{busy ? "Saving..." : "Save profile"}</button>{profileStatus && <span role="status">✓ {profileStatus}</span>}</div>
        </form>
      </section>

      <section className="card reset-card reset-card-prominent">
        <div><span className="eyebrow">Reset zone</span><h2>Start a new game</h2><p>Clear coins, quests, food, spending, XP, all stats and streaks, weight, feelings, alarms, and wishlist. Joelix stays installed.</p></div>
        {!confirmReset ? <button className="reset-button reset-button-large" onClick={() => setConfirmReset(true)}>Reset all game data</button> : <div className="reset-confirm" role="alert"><strong>Reset everything?</strong><span>All game data and statistics will return to zero. This cannot be undone.</span><div><button className="reset-cancel" onClick={() => setConfirmReset(false)} disabled={busy}>Cancel</button><button className="reset-button" onClick={() => void resetGame()} disabled={busy}>{busy ? "Resetting..." : "Yes, reset all"}</button></div></div>}
      </section>

      <section className="level-card card">
        <div className="level-badge"><small>LVL</small><strong>{String(level).padStart(2, "0")}</strong></div>
        <div><span className="eyebrow">Level 100 journey</span><h2>{xp.toLocaleString("en-US")} total XP</h2><div className="xp-track"><span style={{ width: `${levelProgress}%` }} /></div><small>{level === 100 ? "MAX LEVEL UNLOCKED" : `${100 - levelProgress} XP to level ${level + 1}`}</small></div>
      </section>

      <div className="player-grid">
        <section className="card tracker-card">
          <div className="section-title-row"><div><span className="eyebrow">Weight tracker</span><h2>Body trend</h2></div><span className={`cloud-badge ${cloudReady ? "ready" : ""}`}>{cloudReady ? "Cloud save" : "Session save"}</span></div>
          <form className="inline-log" onSubmit={submitWeight}><label><span>Weight (kg)</span><input value={weight} onChange={(event) => setWeight(event.target.value)} type="number" min="25" max="400" step="0.1" placeholder="72.5" /></label><button className="primary-button" disabled={busy}>Log</button></form>
          <div className="weight-chart" aria-label="Recent weight trend">
            {chart.length > 0 ? chart.map((entry) => {
              const height = maxWeight === minWeight ? 60 : 28 + ((entry.weightKg - minWeight) / (maxWeight - minWeight)) * 62;
              return <span key={entry.id} style={{ height: `${height}%` }} title={`${entry.weightKg} kg on ${entry.loggedOn}`}><b>{entry.weightKg}</b></span>;
            }) : <p className="empty-state">Log your first weight to start the chart.</p>}
          </div>
          <div className="simple-history">{weights.slice(0, 4).map((entry) => <span key={entry.id}><b>{entry.weightKg} kg</b><small>{entry.loggedOn}</small></span>)}</div>
        </section>

        <section className="card tracker-card feeling-card">
          <div className="section-title-row"><div><span className="eyebrow">My feeling today</span><h2>Daily check-in</h2></div></div>
          <form onSubmit={submitMood}>
            <div className="feeling-picker" role="group" aria-label="How are you feeling today?">{feelings.map((feeling) => <button type="button" key={feeling.score} className={selectedMood === feeling.score ? "active" : ""} aria-pressed={selectedMood === feeling.score} onClick={() => setSelectedMood(feeling.score)}><span>{feeling.emoji}</span><small>{feeling.label}</small></button>)}</div>
            <label className="note-field"><span>One line about today (optional)</span><textarea value={moodNote} onChange={(event) => setMoodNote(event.target.value)} maxLength={500} placeholder="What affected your energy or mood?" /></label>
            <button className="primary-button full" disabled={busy}>Save feeling</button>
          </form>
          <div className="mood-history">{moods.slice(0, 4).map((entry) => <article key={entry.id}><span>{feelings.find((item) => item.score === entry.score)?.emoji}</span><div><strong>{entry.label}</strong><small>{entry.note || "No note"} · {entry.loggedOn}</small></div></article>)}</div>
          <p className="form-note">This is a reflection tool, not a mental-health diagnosis. If you feel unsafe or in crisis, contact local emergency or crisis support now.</p>
        </section>
      </div>

      <section className="card alarm-card">
        <div><span className="eyebrow">Work alarm</span><h2>Keep money quests moving</h2><p>Notify me while Joelix is open or installed.</p></div>
        <label><span>Repeat</span><select value={alarmMinutes} onChange={(event) => onAlarmChange(alarmEnabled, Number(event.target.value))}><option value="30">Every 30 min</option><option value="60">Every 60 min</option><option value="90">Every 90 min</option><option value="120">Every 2 hours</option></select></label>
        <button className={`primary-button ${alarmEnabled ? "alarm-on" : ""}`} onClick={toggleAlarm}>{alarmEnabled ? "Pause alarm" : "Enable alarm"}</button>
        <small className="alarm-explain">For a guaranteed alert when every browser is closed, also set a normal phone or PC alarm. Web apps cannot promise always-on background delivery on every device.</small>
        {alarmStatus && <p className="form-note">{alarmStatus}</p>}
      </section>

    </div>
  );
}
