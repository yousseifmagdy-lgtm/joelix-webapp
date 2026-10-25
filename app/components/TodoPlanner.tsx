"use client";

import { FormEvent, useMemo, useState, type CSSProperties } from "react";
import type { TodoCategory, TodoItem, TodoList, TodoPlannerState } from "./types";

type Props = {
  state: TodoPlannerState;
  onChange: (state: TodoPlannerState) => void;
};

const CATEGORIES: Array<{ name: TodoCategory; color: string; symbol: string }> = [
  { name: "Work", color: "#45d6ff", symbol: "W" },
  { name: "Health", color: "#71ef9a", symbol: "H" },
  { name: "Money", color: "#ffd35a", symbol: "$" },
  { name: "Content", color: "#ff668c", symbol: "C" },
  { name: "Learning", color: "#a98cff", symbol: "L" },
  { name: "Personal", color: "#ff9d55", symbol: "P" },
  { name: "Home", color: "#e7edf5", symbol: "⌂" },
  { name: "Other", color: "#99a9ba", symbol: "+" },
];

const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseDate = (value: string) => new Date(`${value}T12:00:00`);
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function categoryMeta(category: TodoCategory) {
  return CATEGORIES.find((item) => item.name === category) || CATEGORIES[CATEGORIES.length - 1];
}

function listProgress(list: TodoList) {
  if (!list.items.length) return 0;
  return Math.round(list.items.reduce((sum, item) => sum + item.progress, 0) / list.items.length);
}

function dayProgress(lists: TodoList[]) {
  const items = lists.flatMap((list) => list.items);
  if (!items.length) return 0;
  return Math.round(items.reduce((sum, item) => sum + item.progress, 0) / items.length);
}

function formatDay(value: string, long = false) {
  return new Intl.DateTimeFormat("en-US", long
    ? { weekday: "long", month: "long", day: "numeric", year: "numeric" }
    : { month: "short", day: "numeric" }
  ).format(parseDate(value));
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function calendarCells(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1, 12);
  const start = new Date(year, monthIndex, 1 - first.getDay(), 12);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { key: dateKey(date), date, currentMonth: date.getMonth() === monthIndex };
  });
}

export function TodoPlanner({ state, onChange }: Props) {
  const today = dateKey();
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12));
  const [listTitle, setListTitle] = useState("");
  const [listCategory, setListCategory] = useState<TodoCategory>("Work");
  const [taskDrafts, setTaskDrafts] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState<TodoCategory | "All">("All");

  const cells = useMemo(() => calendarCells(visibleMonth), [visibleMonth]);
  const selectedLists = useMemo(() => state.lists.filter((list) => list.date === selectedDate), [state.lists, selectedDate]);
  const visibleLists = useMemo(() => categoryFilter === "All" ? selectedLists : selectedLists.filter((list) => list.category === categoryFilter), [selectedLists, categoryFilter]);
  const selectedItems = selectedLists.flatMap((list) => list.items);
  const completedItems = selectedItems.filter((item) => item.progress >= 100).length;
  const selectedProgress = dayProgress(selectedLists);
  const selectedMeta = useMemo(() => {
    const dates = new Map<string, { lists: number; items: number; progress: number }>();
    state.lists.forEach((list) => {
      const sameDay = state.lists.filter((candidate) => candidate.date === list.date);
      if (!dates.has(list.date)) dates.set(list.date, { lists: sameDay.length, items: sameDay.flatMap((candidate) => candidate.items).length, progress: dayProgress(sameDay) });
    });
    return dates;
  }, [state.lists]);

  const updateLists = (updater: (lists: TodoList[]) => TodoList[]) => onChange({ ...state, lists: updater(state.lists) });

  const selectDate = (key: string) => {
    const date = parseDate(key);
    setSelectedDate(key);
    if (date.getMonth() !== visibleMonth.getMonth() || date.getFullYear() !== visibleMonth.getFullYear()) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
    }
  };

  const goToday = () => {
    const now = new Date();
    setSelectedDate(today);
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1, 12));
  };

  const moveMonth = (amount: number) => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1, 12));

  const addList = (event: FormEvent) => {
    event.preventDefault();
    const title = listTitle.trim();
    if (!title) return;
    const list: TodoList = { id: uid("list"), title, category: listCategory, date: selectedDate, items: [] };
    updateLists((lists) => [...lists, list]);
    setListTitle("");
  };

  const patchList = (id: string, patch: Partial<TodoList>) => updateLists((lists) => lists.map((list) => list.id === id ? { ...list, ...patch } : list));

  const removeList = (id: string) => {
    if (!window.confirm("Remove this list and all of its tasks?")) return;
    updateLists((lists) => lists.filter((list) => list.id !== id));
  };

  const addTask = (listId: string) => {
    const title = (taskDrafts[listId] || "").trim();
    if (!title) return;
    const item: TodoItem = { id: uid("todo"), title, progress: 0, done: false, createdAt: new Date().toISOString() };
    updateLists((lists) => lists.map((list) => list.id === listId ? { ...list, items: [...list.items, item] } : list));
    setTaskDrafts((drafts) => ({ ...drafts, [listId]: "" }));
  };

  const patchTask = (listId: string, itemId: string, patch: Partial<TodoItem>) => updateLists((lists) => lists.map((list) => list.id === listId ? {
    ...list,
    items: list.items.map((item) => item.id === itemId ? { ...item, ...patch } : item),
  } : list));

  const setTaskProgress = (listId: string, itemId: string, progress: number) => {
    const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
    patchTask(listId, itemId, { progress: safeProgress, done: safeProgress >= 100 });
  };

  const removeTask = (listId: string, itemId: string) => updateLists((lists) => lists.map((list) => list.id === listId ? { ...list, items: list.items.filter((item) => item.id !== itemId) } : list));

  return (
    <div className="screen todo-planner">
      <header className="todo-hero">
        <div><span>JOELIX · DAILY COMMAND SYSTEM</span><h1>To Do List</h1><p>Build separate mission lists for every day and develop each task from zero to complete.</p></div>
        <div className="todo-hero-score" style={{ "--todo-day-progress": `${selectedProgress * 3.6}deg` } as CSSProperties}><strong>{selectedProgress}%</strong><span>day progress</span></div>
      </header>

      <div className="todo-workspace">
        <aside className="todo-calendar-panel">
          <header><button onClick={() => moveMonth(-1)} aria-label="Previous month">‹</button><div><span>MISSION CALENDAR</span><strong>{monthLabel(visibleMonth)}</strong></div><button onClick={() => moveMonth(1)} aria-label="Next month">›</button></header>
          <div className="todo-weekdays">{["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="todo-calendar-grid">{cells.map((cell) => { const meta = selectedMeta.get(cell.key); return <button key={cell.key} className={`${cell.currentMonth ? "" : "outside"} ${cell.key === selectedDate ? "selected" : ""} ${cell.key === today ? "today" : ""}`} onClick={() => selectDate(cell.key)} aria-label={`${formatDay(cell.key, true)}${meta ? `, ${meta.items} tasks, ${meta.progress}% complete` : ""}`}><span>{cell.date.getDate()}</span>{meta && <><i style={{ width: `${meta.progress}%` }} /><small>{meta.items}</small></>}</button>; })}</div>
          <button className="todo-today-button" onClick={goToday}>Jump to today</button>
          <section className="todo-category-legend"><span>CATEGORIES</span><div>{CATEGORIES.map((category) => <button key={category.name} className={categoryFilter === category.name ? "active" : ""} onClick={() => setCategoryFilter(categoryFilter === category.name ? "All" : category.name)}><i style={{ background: category.color }} />{category.name}</button>)}</div></section>
        </aside>

        <main className="todo-day-panel">
          <header className="todo-day-heading"><div><span>{selectedDate === today ? "TODAY" : "SELECTED DAY"}</span><h2>{formatDay(selectedDate, true)}</h2></div><div><strong>{completedItems}/{selectedItems.length}</strong><small>tasks complete</small></div></header>
          <section className="todo-day-progress"><div><span>Daily development</span><strong>{selectedProgress}%</strong></div><i><b style={{ width: `${selectedProgress}%` }} /></i><small>{selectedLists.length} list{selectedLists.length === 1 ? "" : "s"} · {selectedItems.length} total task{selectedItems.length === 1 ? "" : "s"}</small></section>

          <form className="todo-new-list" onSubmit={addList}>
            <label><span>New list name</span><input value={listTitle} onChange={(event) => setListTitle(event.target.value)} placeholder="Example: Video launch" maxLength={80} /></label>
            <label><span>Category</span><select value={listCategory} onChange={(event) => setListCategory(event.target.value as TodoCategory)}>{CATEGORIES.map((category) => <option key={category.name} value={category.name}>{category.name}</option>)}</select></label>
            <button disabled={!listTitle.trim()}>+ Create list</button>
          </form>

          {categoryFilter !== "All" && <div className="todo-filter-note">Showing {categoryFilter} lists <button onClick={() => setCategoryFilter("All")}>Show all</button></div>}

          <div className="todo-list-stack">{visibleLists.map((list) => { const meta = categoryMeta(list.category); const progress = listProgress(list); return <article className="todo-list-card" key={list.id} style={{ "--todo-accent": meta.color } as CSSProperties}>
            <header><span className="todo-list-symbol">{meta.symbol}</span><div><input value={list.title} onChange={(event) => patchList(list.id, { title: event.target.value })} aria-label="List name" /><select value={list.category} onChange={(event) => patchList(list.id, { category: event.target.value as TodoCategory })} aria-label="List category">{CATEGORIES.map((category) => <option key={category.name}>{category.name}</option>)}</select></div><div className="todo-list-score"><strong>{progress}%</strong><small>{list.items.filter((item) => item.done).length}/{list.items.length}</small></div><button className="todo-delete-list" onClick={() => removeList(list.id)} aria-label={`Remove ${list.title}`}>×</button></header>
            <div className="todo-list-progress"><i style={{ width: `${progress}%` }} /></div>
            <div className="todo-items">{list.items.map((item) => <div className={`todo-item ${item.done ? "done" : ""}`} key={item.id}>
              <button className="todo-check" onClick={() => setTaskProgress(list.id, item.id, item.done ? 0 : 100)} aria-label={item.done ? `Mark ${item.title} incomplete` : `Complete ${item.title}`}>{item.done ? "✓" : ""}</button>
              <input className="todo-item-title" value={item.title} onChange={(event) => patchTask(list.id, item.id, { title: event.target.value })} aria-label="Task name" />
              <label className="todo-progress-control"><span>Development</span><input type="range" min="0" max="100" step="5" value={item.progress} onChange={(event) => setTaskProgress(list.id, item.id, Number(event.target.value))} /><b>{item.progress}%</b></label>
              <button className="todo-delete-item" onClick={() => removeTask(list.id, item.id)} aria-label={`Remove ${item.title}`}>×</button>
            </div>)}</div>
            {!list.items.length && <p className="todo-empty-list">No tasks yet. Add the first mission below.</p>}
            <div className="todo-add-task"><input value={taskDrafts[list.id] || ""} onChange={(event) => setTaskDrafts((drafts) => ({ ...drafts, [list.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTask(list.id); } }} placeholder={`Add a task to ${list.title}`} maxLength={120} /><button onClick={() => addTask(list.id)} disabled={!(taskDrafts[list.id] || "").trim()}>Add task</button></div>
          </article>; })}</div>

          {!visibleLists.length && <section className="todo-empty-day"><span>＋</span><h3>{categoryFilter === "All" ? "No lists for this day" : `No ${categoryFilter} lists`}</h3><p>{categoryFilter === "All" ? "Create as many categorized lists as you need for this date." : "Clear the category filter or create a new matching list."}</p></section>}
        </main>
      </div>
    </div>
  );
}
