"use client";

import { FormEvent, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type IdeaCategory = "Video" | "Business" | "Game" | "Health" | "Personal";
type IdeaStage = "Spark" | "Building" | "Ready" | "Archived";
type IdeaFilter = "All" | "Pinned" | IdeaStage;

type Idea = {
  id: number;
  title: string;
  body: string;
  category: IdeaCategory;
  stage: IdeaStage;
  pinned: boolean;
  createdOn: string;
  reviewOn: string;
};

const seedIdeas: Idea[] = [
  {
    id: 1,
    title: "Train like a game character for seven days",
    body: "Turn workouts, food, and focused work into daily stats. Show the wins, the failed quests, and the final character screen.",
    category: "Video",
    stage: "Building",
    pinned: true,
    createdOn: "Jul 20",
    reviewOn: "2026-07-22",
  },
  {
    id: 2,
    title: "Weekly boss battle",
    body: "Every Sunday, combine the hardest unfinished tasks into one timed mission with a special XP reward.",
    category: "Game",
    stage: "Spark",
    pinned: false,
    createdOn: "Jul 19",
    reviewOn: "2026-07-25",
  },
  {
    id: 3,
    title: "Thirty-day service challenge",
    body: "Choose one useful freelance service, make one offer every day, and publish the honest money results.",
    category: "Business",
    stage: "Ready",
    pinned: true,
    createdOn: "Jul 18",
    reviewOn: "2026-07-21",
  },
];

const categories: IdeaCategory[] = ["Video", "Business", "Game", "Health", "Personal"];
const filters: IdeaFilter[] = ["All", "Pinned", "Spark", "Building", "Ready", "Archived"];

export function IdeasVault() {
  const [ideas, setIdeas] = useState<Idea[]>(seedIdeas);
  const [selectedId, setSelectedId] = useState(seedIdeas[0].id);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<IdeaFilter>("All");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState<IdeaCategory>("Video");
  const [newReviewOn, setNewReviewOn] = useState("");

  const selected = ideas.find((idea) => idea.id === selectedId) ?? ideas[0];
  const activeIdeas = ideas.filter((idea) => idea.stage !== "Archived");
  const pinnedCount = activeIdeas.filter((idea) => idea.pinned).length;
  const readyCount = activeIdeas.filter((idea) => idea.stage === "Ready").length;
  const sparkPower = Math.min(100, 18 + activeIdeas.length * 11 + pinnedCount * 7 + readyCount * 9);
  const vaultLevel = Math.min(99, Math.max(1, Math.ceil(sparkPower / 12)));

  const visibleIdeas = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ideas
      .filter((idea) => {
        const matchesFilter = filter === "All"
          ? idea.stage !== "Archived"
          : filter === "Pinned"
            ? idea.pinned && idea.stage !== "Archived"
            : idea.stage === filter;
        const matchesSearch = !needle || `${idea.title} ${idea.body} ${idea.category}`.toLowerCase().includes(needle);
        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.id - a.id);
  }, [filter, ideas, query]);

  const captureIdea = (event: FormEvent) => {
    event.preventDefault();
    if (!newTitle.trim()) return;
    const now = new Date();
    const idea: Idea = {
      id: Date.now(),
      title: newTitle.trim(),
      body: newBody.trim() || "Add the details, questions, and next action while the spark is still fresh.",
      category: newCategory,
      stage: "Spark",
      pinned: false,
      createdOn: now.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      reviewOn: newReviewOn,
    };
    setIdeas((items) => [idea, ...items]);
    setSelectedId(idea.id);
    setFilter("All");
    setNewTitle("");
    setNewBody("");
    setNewReviewOn("");
  };

  const updateSelected = (patch: Partial<Idea>) => {
    if (!selected) return;
    setIdeas((items) => items.map((idea) => idea.id === selected.id ? { ...idea, ...patch } : idea));
  };

  const archiveSelected = () => updateSelected({ stage: "Archived", pinned: false });
  const restoreSelected = () => updateSelected({ stage: "Spark" });

  const lampStyle = { "--spark-power": `${sparkPower}%` } as CSSProperties;

  return (
    <div className="screen ideas-screen" style={lampStyle}>
      <section className="idea-lamp-hero">
        <div className="idea-hero-copy">
          <span className="eyebrow">Private archive · White lamp online</span>
          <h1>Ideas</h1>
          <p>A private monochrome archive for valuable thoughts. Capture each idea, refine its details, and preserve it until the right moment.</p>
          <div className="idea-level-strip">
            <span><small>Vault level</small><strong>LV {String(vaultLevel).padStart(2, "0")}</strong></span>
            <div><i style={{ width: `${sparkPower}%` }} /></div>
            <b>{sparkPower}% light</b>
          </div>
        </div>

        <div className="pixel-lamp-stage" aria-hidden="true">
          <div className="lamp-cord" />
          <div className="lamp-shade"><i /></div>
          <div className="lamp-bulb" />
          <div className="lamp-beam" />
          <div className="lamp-floor-glow" />
          {Array.from({ length: 8 }, (_, index) => <span key={index} className={`idea-spark spark-${index + 1}`}>✦</span>)}
          <div className="idea-cartridge"><b>IDEA</b><small>PRIVATE VAULT</small></div>
        </div>
      </section>

      <section className="idea-capture-panel">
        <div className="idea-panel-heading">
          <span><i aria-hidden="true">!</i><span><small>Quick capture</small><strong>Save a new spark</strong></span></span>
          <b>+25 IDEA XP</b>
        </div>
        <form onSubmit={captureIdea}>
          <label className="idea-title-input"><span>Idea name</span><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Write the idea before it escapes..." maxLength={90} autoComplete="off" /></label>
          <label className="idea-body-input"><span>Memory note</span><textarea value={newBody} onChange={(event) => setNewBody(event.target.value)} placeholder="What makes it exciting? What could it become?" rows={4} maxLength={600} /></label>
          <div className="idea-capture-options">
            <label><span>World</span><select value={newCategory} onChange={(event) => setNewCategory(event.target.value as IdeaCategory)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label><span>Review date</span><input type="date" value={newReviewOn} onChange={(event) => setNewReviewOn(event.target.value)} /></label>
            <button type="submit" disabled={!newTitle.trim()}><span aria-hidden="true">◆</span> Capture idea</button>
          </div>
        </form>
      </section>

      <section className="idea-stats" aria-label="Idea vault statistics">
        <article><span>◇</span><small>Active ideas</small><strong>{String(activeIdeas.length).padStart(2, "0")}</strong></article>
        <article><span>◆</span><small>Priority ideas</small><strong>{String(pinnedCount).padStart(2, "0")}</strong></article>
        <article><span>✓</span><small>Ready to build</small><strong>{String(readyCount).padStart(2, "0")}</strong></article>
      </section>

      <div className="idea-toolbar">
        <label><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search every saved idea..." aria-label="Search ideas" /></label>
        <div className="idea-filters" role="group" aria-label="Filter ideas">
          {filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}
        </div>
      </div>

      <div className="idea-workspace">
        <section className="idea-library" aria-label="Saved ideas">
          <div className="idea-library-title"><div><span className="idea-led" /><strong>{filter === "All" ? "Saved memory slots" : `${filter} ideas`}</strong></div><small>{visibleIdeas.length} found</small></div>
          <div className="idea-card-grid">
            {visibleIdeas.map((idea, index) => (
              <article key={idea.id} className={`idea-card stage-${idea.stage.toLowerCase()} ${idea.id === selectedId ? "selected" : ""}`} style={{ "--idea-delay": `${index * 55}ms` } as CSSProperties}>
                <button type="button" className="idea-pin" onClick={() => setIdeas((items) => items.map((item) => item.id === idea.id ? { ...item, pinned: !item.pinned } : item))} aria-label={`${idea.pinned ? "Unpin" : "Pin"} ${idea.title}`} aria-pressed={idea.pinned}>{idea.pinned ? "★" : "☆"}</button>
                <button type="button" className="idea-card-main" onClick={() => setSelectedId(idea.id)}>
                  <span><i>{idea.category}</i><b>{idea.stage}</b></span>
                  <strong>{idea.title}</strong>
                  <p>{idea.body}</p>
                  <footer><small>Saved {idea.createdOn}</small><em>{idea.reviewOn ? `Review ${idea.reviewOn}` : "No review set"}</em></footer>
                </button>
              </article>
            ))}
            {!visibleIdeas.length && <div className="idea-empty"><span aria-hidden="true">☾</span><strong>This shelf is dark</strong><p>Change the filter or capture a new idea to light it up.</p></div>}
          </div>
        </section>

        <aside className="idea-workbench">
          {selected ? (
            <section className={`idea-editor stage-${selected.stage.toLowerCase()}`}>
              <div className="idea-editor-heading"><div><small>Idea workbench</small><strong>Memory #{String(ideas.findIndex((idea) => idea.id === selected.id) + 1).padStart(2, "0")}</strong></div><span>{selected.pinned ? "★ Pinned" : "Lamp note"}</span></div>
              <label><span>Idea name</span><input value={selected.title} onChange={(event) => updateSelected({ title: event.target.value })} maxLength={90} /></label>
              <label><span>Full memory</span><textarea value={selected.body} onChange={(event) => updateSelected({ body: event.target.value })} rows={8} maxLength={1200} /></label>
              <div className="idea-editor-row">
                <label><span>World</span><select value={selected.category} onChange={(event) => updateSelected({ category: event.target.value as IdeaCategory })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label><span>Build stage</span><select value={selected.stage} onChange={(event) => updateSelected({ stage: event.target.value as IdeaStage })}><option>Spark</option><option>Building</option><option>Ready</option><option>Archived</option></select></label>
              </div>
              <label><span>Remind me to review</span><input type="date" value={selected.reviewOn} onChange={(event) => updateSelected({ reviewOn: event.target.value })} /></label>
              <button type="button" className={`idea-pin-large ${selected.pinned ? "active" : ""}`} onClick={() => updateSelected({ pinned: !selected.pinned })}>{selected.pinned ? "★ Priority idea pinned" : "☆ Pin this priority idea"}</button>
              {selected.stage === "Archived"
                ? <button type="button" className="idea-archive restore" onClick={restoreSelected}>Restore to spark shelf</button>
                : <button type="button" className="idea-archive" onClick={archiveSelected}>Move safely to archive</button>}
            </section>
          ) : <section className="idea-editor-empty">Capture an idea to unlock the workbench.</section>}
        </aside>
      </div>

      <p className="screen-footnote">Ideas remain saved while this Joelix game session is open.</p>
    </div>
  );
}
