"use client";

import { FormEvent, useEffect, useState } from "react";
import type { DebtEntry, SpendEntry, WishlistItem } from "./types";

const rewardIdeas = [
  { name: "Slow Saturday brunch", amount: 35, category: "Experience", symbol: "01" },
  { name: "New book", amount: 24, category: "Treat", symbol: "02" },
  { name: "Cinema night", amount: 42, category: "Experience", symbol: "03" },
  { name: "Training gear fund", amount: 80, category: "Gear", symbol: "04" },
];

const cash = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

type Props = {
  moneyBalance: number;
  debts: DebtEntry[];
  allowance: number;
  available: number;
  spentThisMonth: number;
  entries: SpendEntry[];
  onAddSpend: (name: string, amount: number, category: string) => void;
  onAddDebt: (creditor: string, amount: number) => void;
  onRecordDebtPayment: (id: number, amount: number) => void;
  onCompleteDebt: (id: number) => void;
};

export function BuyableStore({ moneyBalance, debts, allowance, available, spentThisMonth, entries, onAddSpend, onAddDebt, onRecordDebtPayment, onCompleteDebt }: Props) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Purchase");
  const [wishName, setWishName] = useState("");
  const [wishAmount, setWishAmount] = useState("");
  const [wishCategory, setWishCategory] = useState("Future buy");
  const [debtCreditor, setDebtCreditor] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtPayments, setDebtPayments] = useState<Record<number, string>>({});
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [wishlistCloud, setWishlistCloud] = useState(false);
  const usedPercent = allowance > 0 ? Math.min((spentThisMonth / allowance) * 100, 100) : 0;
  const activeDebts = debts.filter((debt) => debt.status === "active" && debt.remaining > 0);
  const paidDebts = debts.filter((debt) => debt.status === "paid" || debt.remaining <= 0);
  const debtBalance = activeDebts.reduce((total, debt) => total + debt.remaining, 0);
  const debtPercent = debtBalance > 0 ? Math.min((debtBalance / Math.max(moneyBalance, debtBalance)) * 100, 100) : 0;

  useEffect(() => {
    fetch("/api/wishlist").then(async (response) => {
      const data = await response.json() as { items?: WishlistItem[] };
      if (!response.ok) return;
      setWishlist(data.items ?? []); setWishlistCloud(true);
    }).catch(() => undefined);
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!name.trim() || value <= 0) return;
    onAddSpend(name.trim(), value, category); setName(""); setAmount("");
  };

  const addWish = async (event: FormEvent) => {
    event.preventDefault();
    const value = Number(wishAmount);
    if (!wishName.trim() || value <= 0) return;
    const temporary: WishlistItem = { id: Date.now(), name: wishName.trim(), targetAmount: value, category: wishCategory, addedOn: new Date().toISOString().slice(0, 10) };
    setWishlist((items) => [temporary, ...items]); setWishName(""); setWishAmount("");
    try {
      const response = await fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: temporary.name, targetAmount: value, category: wishCategory }) });
      const data = await response.json() as { item?: WishlistItem };
      if (response.ok && data.item) { setWishlist((items) => items.map((item) => item.id === temporary.id ? data.item! : item)); setWishlistCloud(true); }
    } catch { /* Keep the item available for this session. */ }
  };

  const removeWish = async (id: number) => {
    setWishlist((items) => items.filter((item) => item.id !== id));
    try { await fetch(`/api/wishlist?id=${id}`, { method: "DELETE" }); } catch { /* Session state already updated. */ }
  };

  const buyWish = async (item: WishlistItem) => {
    onAddSpend(item.name, item.targetAmount, item.category);
    setWishlist((items) => items.filter((wish) => wish.id !== item.id));
    try { await fetch("/api/wishlist", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, purchased: true }) }); } catch { /* Purchase still logs in the current session. */ }
  };

  const addDebt = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(debtAmount);
    if (!debtCreditor.trim() || !Number.isFinite(value) || value <= 0) return;
    onAddDebt(debtCreditor.trim(), value);
    setDebtCreditor("");
    setDebtAmount("");
  };

  const recordPayment = (debt: DebtEntry) => {
    const value = Number(debtPayments[debt.id]);
    if (!Number.isFinite(value) || value <= 0) return;
    onRecordDebtPayment(debt.id, Math.min(value, debt.remaining));
    setDebtPayments((current) => ({ ...current, [debt.id]: "" }));
  };

  return (
    <div className="screen buyable-screen">
      <header className="page-heading standard-heading store-heading">
        <div><span className="eyebrow">The spend zone</span><h1>Buyable Coin</h1><p>Plan future purchases, then spend only from your deliberate 30% allowance.</p></div>
        <span className="mono-badge">B/W ONLY</span>
      </header>

      <section className={`buyable-hero ${available < 0 ? "over" : ""}`}>
        <div className="split-coin-large" aria-hidden="true"><span /></div>
        <div className="buyable-number"><span>AVAILABLE NOW</span><strong>{cash(available)}</strong><small>{available < 0 ? "You’ve crossed your soft spending limit" : "Ready to spend without the guilt"}</small></div>
        <div className="buyable-formula"><span>{cash(moneyBalance)}<small>Money Coin</small></span><b>× 30%</b><span>{cash(allowance)}<small>Live allowance</small></span></div>
      </section>

      <section className="spend-meter card mono-card">
        <div className="section-title-row"><div><span className="eyebrow">This month</span><h2>{cash(spentThisMonth)} spent</h2></div><strong>{Math.round(usedPercent)}%</strong></div>
        <div className="mono-progress"><span style={{ width: `${usedPercent}%` }} /></div>
        <p>{cash(Math.max(available, 0))} remains from your live allowance. Money Coin stays untouched.</p>
      </section>

      <section className={`debt-ledger card mono-card ${debtBalance > 0 ? "has-debt" : "clear"}`}>
        <div className="section-title-row"><div><span className="eyebrow">Debt accounts</span><h2>Outstanding debts</h2><p>Add a separate account for every person, bank, card, or company. These records never deduct Money Coin.</p></div><span className="debt-status-badge">{debtBalance > 0 ? `${activeDebts.length} OPEN` : "DEBT FREE"}</span></div>
        <div className="debt-ledger-summary">
          <div className="debt-balance-display"><small>Total outstanding</small><strong>{cash(debtBalance)}</strong><b className="debt-creditor">{activeDebts.length ? `${activeDebts.length} active ${activeDebts.length === 1 ? "debt" : "debts"}` : "Every recorded debt is cleared"}</b><div className="debt-progress"><i style={{ width: `${debtPercent}%` }} /></div><span>{debtBalance > 0 ? `${Math.round(debtPercent)}% compared with earned Money Coin` : "Balance cleared"}</span></div>
          <form className="debt-add-form" onSubmit={addDebt}>
            <label><span>Who is the debt owed to?</span><input value={debtCreditor} onChange={(event) => setDebtCreditor(event.target.value)} type="text" placeholder="Person, bank, card or company" /></label>
            <label><span>Amount</span><input value={debtAmount} onChange={(event) => setDebtAmount(event.target.value)} type="number" min="0.01" step="0.01" placeholder="100" /></label>
            <button type="submit" disabled={!debtCreditor.trim() || !debtAmount || Number(debtAmount) <= 0}>+ Add another debt</button>
          </form>
        </div>

        <div className="debt-account-heading"><div><small>Separate payoff sections</small><strong>{activeDebts.length ? "Choose the debt you are paying" : "No money is currently owed"}</strong></div><span>{paidDebts.length} done</span></div>
        <div className="debt-account-grid">
          {activeDebts.map((debt, index) => {
            const paidAmount = Math.max(0, debt.amount - debt.remaining);
            const paidPercent = debt.amount > 0 ? Math.min((paidAmount / debt.amount) * 100, 100) : 100;
            const payment = debtPayments[debt.id] ?? "";
            return (
              <article className="debt-account-card" key={debt.id}>
                <header><span>DEBT {String(index + 1).padStart(2, "0")}</span><b>ACTIVE</b></header>
                <h3>{debt.creditor}</h3>
                <div className="debt-account-money"><span><small>Remaining</small><strong>{cash(debt.remaining)}</strong></span><span><small>Original</small><b>{cash(debt.amount)}</b></span></div>
                <div className="debt-account-progress"><i style={{ width: `${paidPercent}%` }} /></div>
                <small className="debt-paid-copy">{cash(paidAmount)} returned · added {debt.createdOn}</small>
                <div className="debt-payment-row">
                  <label><span>Payment</span><input value={payment} onChange={(event) => setDebtPayments((current) => ({ ...current, [debt.id]: event.target.value }))} type="number" min="0.01" max={debt.remaining} step="0.01" placeholder="Amount" /></label>
                  <button type="button" onClick={() => recordPayment(debt)} disabled={!payment || Number(payment) <= 0}>Record</button>
                </div>
                <button type="button" className="debt-done-button" onClick={() => onCompleteDebt(debt.id)}>✓ Done · Paid in full</button>
              </article>
            );
          })}
          {!activeDebts.length && <p className="debt-empty-state"><b>✓ ALL CLEAR</b><span>Add a new debt above whenever you need to track one.</span></p>}
        </div>

        {paidDebts.length > 0 && (
          <details className="paid-debt-history">
            <summary>Paid debt history <b>{paidDebts.length}</b></summary>
            <div>{paidDebts.map((debt) => <article key={debt.id}><span aria-hidden="true">✓</span><div><strong>{debt.creditor}</strong><small>Paid in full {debt.paidOn ? `· ${debt.paidOn}` : ""}</small></div><b>{cash(debt.amount)}</b></article>)}</div>
          </details>
        )}
      </section>

      <section className="wishlist-section card mono-card">
        <div className="section-title-row"><div><span className="eyebrow">Buy in the future</span><h2>Wishlist</h2><p>Save a target first. Buy it later when Buyable Coin can cover it.</p></div><span className="mono-badge">{wishlistCloud ? "CLOUD SAVED" : "SESSION"}</span></div>
        <form className="wishlist-form" onSubmit={addWish}>
          <label><span>Future item</span><input value={wishName} onChange={(event) => setWishName(event.target.value)} placeholder="e.g. New headphones" /></label>
          <label><span>Target price</span><input value={wishAmount} onChange={(event) => setWishAmount(event.target.value)} type="number" min="1" step="0.01" placeholder="120" /></label>
          <label><span>Type</span><select value={wishCategory} onChange={(event) => setWishCategory(event.target.value)}><option>Future buy</option><option>Gear</option><option>Experience</option><option>Course</option><option>Gift</option></select></label>
          <button className="mono-button" type="submit">+ Add to wishlist</button>
        </form>
        <div className="wishlist-grid">
          {wishlist.map((item) => {
            const ready = available >= item.targetAmount;
            const progress = item.targetAmount > 0 ? Math.max(0, Math.min((available / item.targetAmount) * 100, 100)) : 0;
            return <article key={item.id} className={ready ? "ready" : ""}>
              <div className="wishlist-top"><span>{item.category}</span><button onClick={() => void removeWish(item.id)} aria-label={`Remove ${item.name} from wishlist`}>×</button></div>
              <strong>{item.name}</strong><b>{cash(item.targetAmount)}</b>
              <div className="wishlist-progress"><span style={{ width: `${progress}%` }} /></div>
              <small>{ready ? "UNLOCKED — allowance can cover it" : `${cash(Math.max(item.targetAmount - available, 0))} more to unlock`}</small>
              <button className="wishlist-buy" onClick={() => void buyWish(item)} disabled={!ready}>{ready ? "Buy + log spend" : "Save for later"}</button>
            </article>;
          })}
          {wishlist.length === 0 && <p className="empty-state">Your wishlist is empty. Add something you want to earn before buying.</p>}
        </div>
      </section>

      <div className="store-layout">
        <section className="reward-list">
          <div className="section-title-row"><div><span className="eyebrow">Reward shelf</span><h2>Make it worth the work</h2></div></div>
          <div className="reward-grid">{rewardIdeas.map((reward) => <article key={reward.name}><span>{reward.symbol}</span><small>{reward.category}</small><strong>{reward.name}</strong><b>{cash(reward.amount)}</b><button onClick={() => onAddSpend(reward.name, reward.amount, reward.category)}>Log this reward</button></article>)}</div>
        </section>

        <section className="custom-spend card mono-card">
          <span className="eyebrow">Real-world purchase</span><h2>Log a spend</h2>
          <form onSubmit={submit}>
            <label><span>What did you buy?</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Purchase or reward" /></label>
            <div><label><span>Amount</span><input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="1" step="0.01" placeholder="30" /></label><label><span>Type</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>Purchase</option><option>Treat</option><option>Gear</option><option>Experience</option></select></label></div>
            <button className="mono-button" type="submit">Spend buyable coin</button>
          </form>
        </section>
      </div>

      <section className="spend-history card mono-card">
        <div className="section-title-row"><div><span className="eyebrow">Ledger</span><h2>Spend history</h2></div><span>{entries.length} entries</span></div>
        <div>{entries.map((entry) => <article key={entry.id}><span className="history-index">{String(entry.id).slice(-2)}</span><div><strong>{entry.name}</strong><small>{entry.category} · {entry.date}</small></div><b>−{cash(entry.amount)}</b></article>)}</div>
      </section>
    </div>
  );
}
