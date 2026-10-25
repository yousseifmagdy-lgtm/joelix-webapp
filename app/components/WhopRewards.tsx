"use client";

import { FormEvent, useMemo, useState, type CSSProperties } from "react";
import type { ContentPlatform, WhopContentItem, WhopRewardRates } from "./types";

type Props = {
  items: WhopContentItem[];
  rates: WhopRewardRates;
  onAdd: (item: Omit<WhopContentItem, "id" | "createdOn" | "claimed">) => void;
  onUpdateViews: (id: number, views: number) => void;
  onRemove: (id: number) => void;
  onToggleClaimed: (id: number) => void;
  onRateChange: (platform: ContentPlatform, rate: number) => void;
};

const platforms: Array<{ id: ContentPlatform; label: string; short: string; icon: string; accent: string }> = [
  { id: "youtube", label: "YouTube", short: "YT", icon: "PLAY", accent: "#ff2f43" },
  { id: "instagram", label: "Instagram", short: "IG", icon: "LENS", accent: "#b64cff" },
  { id: "tiktok", label: "TikTok", short: "TT", icon: "BEAT", accent: "#19e3d5" },
];

const viewFormatter = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const moneyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function nextMilestone(views: number) {
  const milestones = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 5_000_000, 10_000_000];
  return milestones.find((milestone) => views < milestone) ?? Math.ceil((views + 1) / 10_000_000) * 10_000_000;
}

function rewardFor(item: WhopContentItem, rates: WhopRewardRates) {
  return (item.views / 1_000) * rates[item.platform];
}

export function WhopRewards({ items, rates, onAdd, onUpdateViews, onRemove, onToggleClaimed, onRateChange }: Props) {
  const [activePlatform, setActivePlatform] = useState<ContentPlatform>("youtube");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [views, setViews] = useState("");
  const [url, setUrl] = useState("");
  const [editingViews, setEditingViews] = useState<Record<number, string>>({});

  const activeItems = useMemo(
    () => items.filter((item) => item.platform === activePlatform).sort((a, b) => b.views - a.views),
    [items, activePlatform],
  );
  const totalViews = useMemo(() => items.reduce((total, item) => total + item.views, 0), [items]);
  const estimatedReward = useMemo(() => items.reduce((total, item) => total + rewardFor(item, rates), 0), [items, rates]);
  const claimedReward = useMemo(() => items.filter((item) => item.claimed).reduce((total, item) => total + rewardFor(item, rates), 0), [items, rates]);
  const activeViews = activeItems.reduce((total, item) => total + item.views, 0);
  const activeReward = activeItems.reduce((total, item) => total + rewardFor(item, rates), 0);
  const activeMeta = platforms.find((platform) => platform.id === activePlatform)!;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const numericViews = Math.max(0, Math.round(Number(views) || 0));
    if (!title.trim()) return;
    onAdd({ title: title.trim(), platform: activePlatform, views: numericViews, url: url.trim() || undefined });
    setTitle("");
    setViews("");
    setUrl("");
    setShowForm(false);
  };

  const saveViews = (item: WhopContentItem) => {
    const value = Math.max(0, Math.round(Number(editingViews[item.id] ?? item.views) || 0));
    onUpdateViews(item.id, value);
    setEditingViews((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
  };

  return (
    <div className={`screen whop-rewards-screen platform-${activePlatform}`} style={{ "--whop-accent": activeMeta.accent } as CSSProperties}>
      <div className="views-grid-field" aria-hidden="true"><span /><span /><span /></div>

      <header className="whop-rewards-hero">
        <div className="whop-hero-copy">
          <span className="whop-live-line"><i /> WHOP CONTENT REWARDS</span>
          <h1>Turn views into <em>progress.</em></h1>
          <p>Track every upload, update its views, and estimate rewards using the rate you set for each platform.</p>
          <div className="whop-hero-actions">
            <button className="whop-primary-action" onClick={() => setShowForm(true)}>+ Add content</button>
            <span>Custom tracker · estimates only</span>
          </div>
        </div>
        <div className="giant-view-counter" aria-label={`${totalViews.toLocaleString("en-US")} total views`}>
          <span className="counter-eye" aria-hidden="true"><i /></span>
          <small>Total views</small>
          <strong>{totalViews.toLocaleString("en-US").padStart(7, "0")}</strong>
          <b>{items.length} POSTS TRACKED</b>
        </div>
      </header>

      <section className="whop-overview-grid" aria-label="Content reward overview">
        <article><span>VIEW COUNT</span><strong>{viewFormatter.format(totalViews)}</strong><small>Across every platform</small></article>
        <article><span>EST. REWARD</span><strong>{moneyFormatter.format(estimatedReward)}</strong><small>At your custom rates</small></article>
        <article><span>CLAIMED</span><strong>{moneyFormatter.format(claimedReward)}</strong><small>{items.filter((item) => item.claimed).length} content rewards</small></article>
        <article><span>CONTENT</span><strong>{items.length}</strong><small>Uploads in the tracker</small></article>
      </section>

      <nav className="platform-view-tabs" aria-label="Content platforms">
        {platforms.map((platform) => {
          const platformItems = items.filter((item) => item.platform === platform.id);
          const platformViews = platformItems.reduce((total, item) => total + item.views, 0);
          return (
            <button key={platform.id} className={activePlatform === platform.id ? "active" : ""} onClick={() => setActivePlatform(platform.id)} style={{ "--platform-accent": platform.accent } as CSSProperties}>
              <span className="platform-tab-icon">{platform.short}</span>
              <span><strong>{platform.label}</strong><small>{viewFormatter.format(platformViews)} views · {platformItems.length} posts</small></span>
              <b aria-hidden="true">VIEW</b>
            </button>
          );
        })}
      </nav>

      <section className="platform-content-page">
        <header className="platform-page-heading">
          <div className="platform-wordmark"><span>{activeMeta.icon}</span><div><small>{activeMeta.label} content page</small><h2>{activeMeta.label} Views</h2></div></div>
          <div className="platform-page-totals"><span><small>Views</small><strong>{activeViews.toLocaleString("en-US")}</strong></span><span><small>Est. reward</small><strong>{moneyFormatter.format(activeReward)}</strong></span></div>
        </header>

        <div className="reward-rate-console">
          <div><span className="rate-console-eye" aria-hidden="true"><i /></span><span><strong>Reward rate</strong><small>Set your campaign reward for every 1,000 views.</small></span></div>
          <label><span>USD per 1K views</span><span className="rate-input-wrap"><b>$</b><input type="number" min="0" step="0.01" value={rates[activePlatform]} onChange={(event) => onRateChange(activePlatform, Math.max(0, Number(event.target.value) || 0))} aria-label={`${activeMeta.label} reward per 1,000 views`} /></span></label>
        </div>

        {showForm && (
          <form className="whop-content-form" onSubmit={submit}>
            <div className="whop-form-title"><div><span className="eyebrow">New {activeMeta.label} content</span><h3>Add a view tracker</h3></div><button type="button" onClick={() => setShowForm(false)} aria-label="Close form">X</button></div>
            <div className="whop-form-grid">
              <label><span>Content title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. My setup transformation" autoFocus /></label>
              <label><span>Current views</span><input type="number" min="0" value={views} onChange={(event) => setViews(event.target.value)} placeholder="0" /></label>
              <label><span>Post link (optional)</span><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." /></label>
            </div>
            <button className="whop-primary-action" type="submit">Start tracking views</button>
          </form>
        )}

        {activeItems.length > 0 ? (
          <div className="content-view-list">
            {activeItems.map((item, index) => {
              const milestone = nextMilestone(item.views);
              const milestoneProgress = Math.min(100, (item.views / milestone) * 100);
              const reward = rewardFor(item, rates);
              return (
                <article className={`content-view-card ${item.claimed ? "claimed" : ""}`} key={item.id}>
                  <div className="content-rank"><small>#{String(index + 1).padStart(2, "0")}</small><span aria-hidden="true"><i /></span></div>
                  <div className="content-card-main">
                    <div className="content-card-title"><span>{item.platform.toUpperCase()}</span><h3>{item.title}</h3><small>Added {item.createdOn}</small></div>
                    <div className="content-live-metrics">
                      <span><small>LIVE VIEWS</small><strong>{item.views.toLocaleString("en-US")}</strong></span>
                      <span><small>EST. REWARD</small><strong>{moneyFormatter.format(reward)}</strong></span>
                    </div>
                    <div className="view-milestone">
                      <div><span>Next view milestone</span><b>{viewFormatter.format(milestone)}</b></div>
                      <div className="view-progress-track"><span style={{ width: `${milestoneProgress}%` }} /></div>
                      <small>{Math.max(0, milestone - item.views).toLocaleString("en-US")} views to go</small>
                    </div>
                    <div className="content-card-controls">
                      <label><span>Update views</span><input type="number" min="0" value={editingViews[item.id] ?? item.views} onChange={(event) => setEditingViews((current) => ({ ...current, [item.id]: event.target.value }))} /></label>
                      <button onClick={() => saveViews(item)}>Save views</button>
                      <button onClick={() => onUpdateViews(item.id, item.views + 1_000)}>+1K</button>
                      {item.url && <a href={item.url} target="_blank" rel="noreferrer">Open post</a>}
                    </div>
                  </div>
                  <div className="content-card-actions">
                    <button className="claim-reward-button" onClick={() => onToggleClaimed(item.id)}>{item.claimed ? "Claimed" : "Mark claimed"}</button>
                    <button className="remove-content-button" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.title}`}>Remove</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-content-view">
            <span className="empty-view-eye" aria-hidden="true"><i /></span>
            <small>0 VIEWS DETECTED</small>
            <h3>Your {activeMeta.label} content page is ready.</h3>
            <p>Add your first post, enter its view count, and watch the milestone meter grow.</p>
            <button className="whop-primary-action" onClick={() => setShowForm(true)}>+ Add first content</button>
          </div>
        )}
      </section>
    </div>
  );
}
