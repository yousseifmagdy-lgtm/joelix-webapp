"use client";

import { FormEvent, useState } from "react";
import type { CoinTask, TaskKind, TaskPriority } from "./types";

type Props = {
  activeTab: TaskKind;
  onTabChange: (tab: TaskKind) => void;
  physicalTasks: CoinTask[];
  workTasks: CoinTask[];
  bonusTasks: CoinTask[];
  onComplete: (task: CoinTask) => void;
  onAddTask: (task: Omit<CoinTask, "id" | "doneToday" | "icon" | "xp">) => void;
};

export function TaskList({ activeTab, onTabChange, physicalTasks, workTasks, bonusTasks, onComplete, onAddTask }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [reward, setReward] = useState("");
  const [recurrence, setRecurrence] = useState<"Daily" | "One-off">("Daily");
  const [priority, setPriority] = useState<TaskPriority>("optional");
  const tasks = activeTab === "physical" ? physicalTasks : workTasks;
  const mainTasks = tasks.filter((task) => task.priority === "main");
  const optionalTasks = tasks.filter((task) => task.priority !== "main");
  const allTasks = [...tasks, ...bonusTasks];
  const totalAvailable = allTasks.filter((task) => !task.doneToday).reduce((sum, task) => sum + task.reward, 0);
  const remainingTasks = allTasks.filter((task) => !task.doneToday).length;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const numericReward = Number(reward);
    if (!name.trim() || !category.trim() || numericReward <= 0) return;
    onAddTask({ name: name.trim(), category: category.trim(), reward: numericReward, recurrence, kind: activeTab, priority });
    setName(""); setCategory(""); setReward(""); setPriority("optional"); setShowForm(false);
  };

  return (
    <div className={`screen tasks-screen ${activeTab}`}>
      <div className="quest-sandstorm" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <header className="page-heading standard-heading pharaoh-heading">
        <div><span className="eyebrow">Pharaoh&apos;s quest temple</span><h1>Royal Quests</h1><p>Physical quests are Must Do and award XP only. Work quests earn Money Coin and XP.</p></div>
        <button className="primary-button" onClick={() => setShowForm((value) => !value)}>+ Inscribe quest</button>
      </header>

      <div className="task-tabs" role="tablist" aria-label="Task type">
        <button role="tab" aria-selected={activeTab === "physical"} className={activeTab === "physical" ? "active" : ""} onClick={() => onTabChange("physical")}><span>🔥</span><div><strong>Physical</strong><small>Must Do · XP only</small></div></button>
        <button role="tab" aria-selected={activeTab === "work"} className={activeTab === "work" ? "active" : ""} onClick={() => onTabChange("work")}><span>$</span><div><strong>Work</strong><small>Money Coin</small></div></button>
      </div>

      {showForm && (
        <form className="create-task card" onSubmit={submit}>
          <div className="section-title-row"><div><span className="eyebrow">Custom quest</span><h2>{activeTab === "physical" ? "Create a Must Do quest" : "Create an earning rule"}</h2></div><button type="button" className="icon-button" onClick={() => setShowForm(false)} aria-label="Close form">×</button></div>
          <div className="form-grid">
            <label><span>Quest name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder={activeTab === "physical" ? "e.g. 20 min cycle" : "e.g. Send proposal"} autoFocus /></label>
            <label><span>Category</span><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder={activeTab === "physical" ? "Cardio" : "Freelance"} /></label>
            <label><span>{activeTab === "physical" ? "XP reward" : "Money Coin reward"}</span><input value={reward} onChange={(event) => setReward(event.target.value)} type="number" min={activeTab === "physical" ? "10" : "1"} placeholder={activeTab === "physical" ? "40" : "75"} /></label>
            <label><span>Frequency</span><select value={recurrence} onChange={(event) => setRecurrence(event.target.value as "Daily" | "One-off")}><option>Daily</option><option>One-off</option></select></label>
            <label><span>Quest class</span><select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}><option value="main">Main Quest</option><option value="optional">Optional Quest</option></select></label>
          </div>
          <p className="form-note">Choosing Main Quest moves the previous Main Quest to Optional.</p>
          <button className="primary-button full" type="submit">Add {priority === "main" ? "main" : "optional"} quest</button>
        </form>
      )}

      <section className="task-summary card">
        <span className="task-summary-icon">{activeTab === "physical" ? "🔥" : "$"}</span>
        <div><small>Still available today</small><strong>{activeTab === "physical" ? `${remainingTasks} Must Do quests` : `+$${totalAvailable.toLocaleString("en-US")} Money Coin`}</strong></div>
        <span>{allTasks.filter((task) => task.doneToday).length}/{allTasks.length} done</span>
      </section>

      <section className="quest-group main-group" aria-labelledby="main-quest-title">
        <div className="quest-group-title"><div><span className="quest-rank main">ROYAL</span><div><h2 id="main-quest-title">Royal Decree</h2><p>Your most important mission.</p></div></div></div>
        <div className="task-list">{mainTasks.map((task) => <QuestRow key={task.id} task={task} activeTab={activeTab} onComplete={onComplete} />)}</div>
      </section>

      <section className="quest-group bonus-group" aria-labelledby="bonus-quest-title">
        <div className="quest-group-title"><div><span className="quest-rank bonus">SUN</span><div><h2 id="bonus-quest-title">{activeTab === "physical" ? "10 Daily Must Do Exercises" : "Daily Sun Trial"}</h2><p>{activeTab === "physical" ? "A balanced mix of cardio, workouts, mobility, and sport is shuffled from 100 exercises every day." : "A new surprise money mission appears every day."}</p></div></div><small>{activeTab === "physical" ? "Shuffled daily · 10 of 100" : "Refreshes at midnight"}</small></div>
        <div className="task-list bonus-task-list">{bonusTasks.map((task) => <QuestRow key={task.id} task={task} activeTab={activeTab} onComplete={onComplete} />)}</div>
        {activeTab === "physical" && <p className="burn-estimate-note"><strong>Must Do rule:</strong> Exercise quests award XP only. They never add calories to the fixed Fuel budget. Warm up, use safe form, and stop if you feel pain.</p>}
      </section>

      <section className="quest-group optional-group" aria-labelledby="optional-quest-title">
        <div className="quest-group-title"><div><span className="quest-rank optional">SCROLL</span><div><h2 id="optional-quest-title">Papyrus Quests</h2><p>Extra progress when you have capacity.</p></div></div></div>
        <div className="task-list">{optionalTasks.map((task) => <QuestRow key={task.id} task={task} activeTab={activeTab} onComplete={onComplete} />)}</div>
      </section>
      <p className="screen-footnote">Every completed quest awards XP. Daily and Bonus quests refresh at midnight.</p>
    </div>
  );
}

function QuestRow({ task, activeTab, onComplete }: { task: CoinTask; activeTab: TaskKind; onComplete: (task: CoinTask) => void }) {
  return (
    <article className={`task-row ${task.doneToday ? "done" : ""} ${task.priority}`}>
      <span className="task-symbol">{task.doneToday ? "✓" : task.icon}</span>
      <div className="task-copy"><small>{task.category} · {task.recurrence}</small><strong>{task.name}</strong></div>
      <div className="task-reward">{activeTab === "physical" ? <><small>Must Do reward</small><strong>+{task.xp} XP</strong><small>No calorie increase</small></> : <><small>Money reward</small><strong>+${task.reward}</strong><small>+{task.xp} XP</small></>}</div>
      <button className="complete-button" onClick={() => onComplete(task)} disabled={task.doneToday}>{task.doneToday ? "Done" : "Complete"}</button>
    </article>
  );
}
