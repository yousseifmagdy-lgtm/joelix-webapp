"use client";

import { FormEvent, useEffect, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string; citations?: Array<{ title: string; url: string }>; notice?: string; live?: boolean };
type ConnectionState = { state: "checking" | "connected" | "disconnected"; available?: boolean; networkRestricted?: boolean; notice?: string };

const prompts = ["How can I find my first freelance client?", "Give me a safe 30-minute workout.", "What is one health habit to improve today?"];
const floatingWelcome: ChatMessage = { role: "assistant", content: "I’m The Best. Ask me about legitimate ways to earn money, general health, or workouts." };

async function loadConnection(): Promise<ConnectionState> {
  try {
    const response = await fetch("/api/coach", { cache: "no-store" });
    const data = await response.json() as { connected?: boolean; available?: boolean; networkRestricted?: boolean; notice?: string };
    return data.connected ? { state: "connected", available: true } : { state: "disconnected", available: data.available, networkRestricted: data.networkRestricted, notice: data.notice };
  } catch {
    return { state: "disconnected", notice: "The live AI service is not configured." };
  }
}

export function Coach() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: "I’m The Best. Ask me about legitimate ways to earn money, general health, or workouts. Live answers can check current internet sources." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>({ state: "checking" });
  const [authStarted, setAuthStarted] = useState(false);
  const [authUrl, setAuthUrl] = useState("");
  const latestLiveState = [...messages].reverse().find((message) => typeof message.live === "boolean")?.live;

  const checkConnection = async () => setConnection(await loadConnection());

  useEffect(() => {
    let active = true;
    loadConnection().then((next) => { if (active) setConnection(next); });
    return () => { active = false; };
  }, []);

  const connectCodex = async () => {
    const loginWindow = window.open("about:blank", "_blank");
    setConnection({ state: "checking", available: true });
    try {
      const response = await fetch("/api/coach/auth", { method: "POST" });
      const data = await response.json() as { authUrl?: string; error?: string };
      if (!response.ok || !data.authUrl) throw new Error(data.error || "ChatGPT sign-in could not start.");
      setAuthUrl(data.authUrl);
      if (loginWindow) loginWindow.location.replace(data.authUrl);
      setAuthStarted(true);
      setConnection({ state: "disconnected", available: true, notice: "Finish signing in with ChatGPT in the new tab, return here, then press Check again." });
    } catch (error) {
      loginWindow?.close();
      setConnection({ state: "disconnected", available: false, notice: error instanceof Error ? error.message : "ChatGPT sign-in could not start." });
    }
  };

  const ask = async (question: string) => {
    if (!question.trim() || loading) return;
    const userMessage: ChatMessage = { role: "user", content: question.trim() };
    const next = [...messages, userMessage]; setMessages(next); setInput(""); setLoading(true);
    try {
      const response = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: question.trim(), history: messages.slice(-6) }) });
      const data = await response.json() as { answer?: string; citations?: Array<{ title: string; url: string }>; notice?: string; error?: string; live?: boolean };
      if (!response.ok) throw new Error(data.error || "The Best is unavailable.");
      setMessages([...next, { role: "assistant", content: data.answer || "Try asking again.", citations: data.citations, notice: data.notice, live: data.live }]);
      setConnection(data.live ? { state: "connected" } : { state: "disconnected", notice: data.notice });
    } catch (error) {
      setMessages([...next, { role: "assistant", content: error instanceof Error ? error.message : "The Best is unavailable." }]);
    } finally { setLoading(false); }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void ask(input); };

  return (
    <div className="screen coach-screen">
      <header className="page-heading standard-heading"><div><span className="eyebrow">Internet coach</span><h1>The Best</h1><p>Money · health · workouts only, with live internet-backed guidance.</p></div><span className={`coach-status ${connection.state === "disconnected" || latestLiveState === false ? "offline" : ""}`}><i /> {connection.state === "checking" ? "Checking AI" : connection.state === "connected" && latestLiveState !== false ? "Live AI online" : "Offline advice mode"}</span></header>
      <section className="coach-shell card">
        {connection.state === "disconnected" && <div className={`codex-connect-card${connection.networkRestricted ? " restricted" : ""}`} role="status"><div><strong>{connection.networkRestricted ? "Restart Joelix outside Codex" : "Connect Codex on this PC"}</strong><span>{connection.notice || "Connect your ChatGPT account to turn on live answers."}</span></div><div className="codex-connect-actions">{authUrl && <a href={authUrl} target="_blank" rel="noopener noreferrer">Open sign-in</a>}{!connection.networkRestricted && <button type="button" onClick={() => { if (connection.available && !authStarted) void connectCodex(); else { setConnection({ state: "checking" }); void checkConnection(); } }}>{connection.available ? authStarted ? "Check again" : "Connect ChatGPT" : "Retry"}</button>}</div></div>}
        <div className="coach-prompts">{prompts.map((prompt) => <button key={prompt} onClick={() => void ask(prompt)}>{prompt}</button>)}</div>
        <div className="chat-log" aria-live="polite">
          {messages.map((message, index) => <article key={`${message.role}-${index}`} className={message.role}>
            <span>{message.role === "assistant" ? "TB" : "YOU"}</span>
            <div><p>{message.content}</p>{message.notice && <small className="coach-notice">{message.notice}</small>}{message.citations && message.citations.length > 0 && <div className="citation-list">{message.citations.map((citation) => <a key={citation.url} href={citation.url} target="_blank" rel="noreferrer">{citation.title} ↗</a>)}</div>}</div>
          </article>)}
          {loading && <article className="assistant thinking"><span>TB</span><div><p>Checking live sources...</p></div></article>}
        </div>
        <form className="coach-form" onSubmit={submit}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask The Best..." aria-label="Ask The Best" maxLength={2000} /><button className="primary-button" disabled={loading}>Send</button></form>
      </section>
      <p className="screen-footnote">General education only. No guaranteed income, diagnosis, treatment, or emergency advice.</p>
    </div>
  );
}

type FloatingCoachProps = { onOpenFull: () => void };

export function FloatingCoach({ onOpenFull }: FloatingCoachProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([floatingWelcome]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>({ state: "checking" });

  useEffect(() => {
    if (!open) return;
    let active = true;
    loadConnection().then((next) => { if (active) setConnection(next); });
    return () => { active = false; };
  }, [open]);

  const ask = async (question: string) => {
    if (!question.trim() || loading) return;
    const userMessage: ChatMessage = { role: "user", content: question.trim() };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question.trim(), history: messages.slice(-6) }),
      });
      const data = await response.json() as { answer?: string; citations?: Array<{ title: string; url: string }>; notice?: string; error?: string; live?: boolean };
      if (!response.ok) throw new Error(data.error || "The Best is unavailable.");
      setMessages([...next, { role: "assistant", content: data.answer || "Try asking again.", citations: data.citations, notice: data.notice, live: data.live }]);
      setConnection(data.live ? { state: "connected" } : { state: "disconnected", notice: data.notice });
    } catch (error) {
      setMessages([...next, { role: "assistant", content: error instanceof Error ? error.message : "The Best is unavailable." }]);
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask(input);
  };

  return (
    <aside className={`floating-coach${open ? " open" : ""}`} aria-label="The Best AI assistant">
      {open && <section className="floating-coach-panel" role="dialog" aria-label="Chat with The Best AI">
        <header className="floating-coach-header">
          <span className="floating-coach-avatar" aria-hidden="true">TB</span>
          <div><strong>The Best AI</strong><small><i className={connection.state} /> {connection.state === "connected" ? "Internet connected" : connection.state === "checking" ? "Checking connection" : "Local advice mode"}</small></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close The Best AI">×</button>
        </header>
        <div className="floating-coach-log" aria-live="polite">
          {messages.map((message, index) => <article key={`${message.role}-${index}`} className={message.role}>
            <span>{message.role === "assistant" ? "TB" : "YOU"}</span>
            <div><p>{message.content}</p>{message.notice && <small>{message.notice}</small>}{message.citations && message.citations.length > 0 && <div className="floating-coach-citations">{message.citations.map((citation) => <a key={citation.url} href={citation.url} target="_blank" rel="noreferrer">{citation.title} ↗</a>)}</div>}</div>
          </article>)}
          {loading && <article className="assistant thinking"><span>TB</span><div><p>Thinking and checking live sources...</p></div></article>}
        </div>
        {messages.length === 1 && <div className="floating-coach-prompts">{prompts.slice(0, 2).map((prompt) => <button type="button" key={prompt} onClick={() => void ask(prompt)}>{prompt}</button>)}</div>}
        <form className="floating-coach-form" onSubmit={submit}>
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about health, money, or workouts..." aria-label="Ask The Best AI" maxLength={2000} />
          <button type="submit" disabled={loading || !input.trim()} aria-label="Send message">↑</button>
        </form>
        <button type="button" className="floating-coach-full" onClick={onOpenFull}>Open full assistant</button>
      </section>}
      <button type="button" className="floating-coach-trigger" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-label={open ? "Close The Best AI" : "Open The Best AI"}>
        <span className="floating-coach-avatar" aria-hidden="true">TB</span>
        <span><strong>The Best AI</strong><small>Health · money · workouts</small></span>
        <i aria-hidden="true" />
      </button>
    </aside>
  );
}
