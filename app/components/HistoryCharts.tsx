type Props = {
  todayCalorieBalance: number;
  todayMoneyEarned: number;
  tasksCompletedToday: number;
  history: {
    calorieBalances: number[];
    moneyEarned: number[];
    tasksCompleted: number[];
    streak: number;
  };
};

const cash = (value: number) => `$${value.toLocaleString("en-US")}`;

function recentDayLabels() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - index), 12);
    return {
      short: index === 6 ? "TODAY" : new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date).toUpperCase(),
      full: new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(date),
      range: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date),
    };
  });
}

export function HistoryCharts({ todayCalorieBalance, todayMoneyEarned, tasksCompletedToday, history }: Props) {
  const calorieData = [...history.calorieBalances.slice(-6), todayCalorieBalance];
  const moneyData = [...history.moneyEarned.slice(-6), todayMoneyEarned];
  const taskData = [...history.tasksCompleted.slice(-6), tasksCompletedToday];
  const labels = recentDayLabels();
  const totalMoney = moneyData.reduce((sum, value) => sum + value, 0);
  const totalTasks = taskData.reduce((sum, value) => sum + value, 0);
  const activeDays = taskData.filter((value) => value > 0).length;
  const maxMoney = Math.max(1, ...moneyData);
  const maxTasks = Math.max(1, ...taskData);
  const maxCalorieBalance = Math.max(1, ...calorieData.map((value) => Math.abs(value)));
  const bestMoneyValue = Math.max(...moneyData);
  const bestMoneyIndex = moneyData.indexOf(bestMoneyValue);
  const bestTaskValue = Math.max(...taskData);
  const bestTaskIndex = taskData.indexOf(bestTaskValue);
  const hasStats = totalMoney > 0 || totalTasks > 0;
  const dateRange = `${labels[0].range}–${labels[6].range}`;
  const factHeadline = totalMoney > 0
    ? `${labels[bestMoneyIndex].short} was your top money day: ${cash(bestMoneyValue)}.`
    : totalTasks > 0
      ? `${labels[bestTaskIndex].short} was your strongest quest day: ${bestTaskValue}.`
      : "Your first comic issue is ready for action.";
  const factCopy = hasStats
    ? `${totalTasks} quests across ${activeDays} active ${activeDays === 1 ? "day" : "days"}. Every number here comes from your saved Joelix activity.`
    : "Complete a quest or earn Money Coin. Joelix will build these panels from your real saved results.";

  return (
    <div className="screen history-screen comic-stats-screen">
      <header className="comic-stats-hero">
        <div className="comic-issue-tag"><span>JOELIX WEEKLY</span><b>ISSUE 01</b></div>
        <div className="comic-hero-copy"><h1>POWER<br />STATS!</h1><p>{dateRange} · Your seven-day scorecard—earned money, completed quests, and fixed Fuel budget snapshots.</p></div>
        <div className="comic-streak-burst" aria-label={`${history.streak} day streak`}><small>STREAK</small><strong>{history.streak}</strong><span>{history.streak === 1 ? "DAY" : "DAYS"}</span></div>
        <span className="comic-action-word" aria-hidden="true">LEVEL UP!</span>
      </header>

      <section className="stat-grid comic-stat-grid" aria-label="Current seven-day totals">
        <article className="comic-stat fuel"><span>01</span><div><small>Current Fuel budget</small><strong>{todayCalorieBalance.toLocaleString("en-US")}</strong><em>CALORIES LEFT</em></div></article>
        <article className="comic-stat cash"><span>02</span><div><small>Money earned · 7 days</small><strong>{cash(totalMoney)}</strong><em>REAL TOTAL</em></div></article>
        <article className="comic-stat quests"><span>03</span><div><small>Quests completed · 7 days</small><strong>{totalTasks}</strong><em>{activeDays} ACTIVE {activeDays === 1 ? "DAY" : "DAYS"}</em></div></article>
      </section>

      <section className="chart-card card calorie-chart comic-panel comic-panel-wide">
        <div className="comic-panel-heading"><span>CHAPTER 01</span><div><small>Fixed Fuel budget</small><h2>Fuel balance scan</h2></div><p>Exact end-of-day calories remaining</p></div>
        <div className="calorie-bars" role="img" aria-label={`Fuel budget balances from ${labels[0].full} through ${labels[6].full}`}>
          {calorieData.map((value, index) => <div className="calorie-column" key={`${labels[index].full}-${index}`} title={`${labels[index].full}: ${value.toLocaleString("en-US")} calories`}><div className="positive-zone">{value > 0 && <span style={{ height: `${Math.max((value / maxCalorieBalance) * 100, 8)}%` }}><b>+{value.toLocaleString("en-US")}</b></span>}</div><div className="zero-line" /><div className="negative-zone">{value < 0 && <span style={{ height: `${Math.max((Math.abs(value) / maxCalorieBalance) * 100, 8)}%` }}><b>{value.toLocaleString("en-US")}</b></span>}</div><small>{labels[index].short}</small></div>)}
        </div>
        <div className="comic-chart-key"><span><i /> ABOVE ZERO</span><span><i /> BELOW ZERO</span><b>NOW: {todayCalorieBalance.toLocaleString("en-US")}</b></div>
      </section>

      <div className="chart-split comic-chart-split">
        <section className="chart-card card money-chart comic-panel">
          <div className="comic-panel-heading"><span>CHAPTER 02</span><div><small>Money Coin</small><h2>Cash earned</h2></div><strong>{cash(totalMoney)}</strong></div>
          <div className="standard-bars" role="img" aria-label={`Money earned from ${labels[0].full} through ${labels[6].full}`}>
            {moneyData.map((value, index) => <div key={`${labels[index].full}-${index}`} title={`${labels[index].full}: ${cash(value)}`}><span style={{ height: `${value === 0 ? 0 : Math.max((value / maxMoney) * 100, 6)}%` }}><b>{cash(value)}</b></span><small>{labels[index].short}</small></div>)}
          </div>
          <p className="comic-chart-caption">TOP DAY · {bestMoneyValue > 0 ? `${labels[bestMoneyIndex].short} ${cash(bestMoneyValue)}` : "NO EARNINGS YET"}</p>
        </section>

        <section className="chart-card card task-chart comic-panel">
          <div className="comic-panel-heading"><span>CHAPTER 03</span><div><small>Consistency</small><h2>Quest power</h2></div><strong>{totalTasks}</strong></div>
          <div className="quest-bars" role="img" aria-label={`Quests completed from ${labels[0].full} through ${labels[6].full}`}>
            {taskData.map((value, index) => <div key={`${labels[index].full}-${index}`} title={`${labels[index].full}: ${value} quests`}><span><i style={{ height: `${value === 0 ? 0 : Math.max((value / maxTasks) * 100, 8)}%` }} /></span><b>{value}</b><small>{labels[index].short}</small></div>)}
          </div>
          <p className="comic-chart-caption">TOP DAY · {bestTaskValue > 0 ? `${labels[bestTaskIndex].short} ${bestTaskValue} QUESTS` : "NO QUESTS YET"}</p>
        </section>
      </div>

      <section className="comic-insight-card">
        <span className="comic-sound-effect" aria-hidden="true">{hasStats ? "BAM!" : "GO!"}</span>
        <div className="comic-speech-bubble"><small>THE TRUE STORY THIS WEEK</small><strong>{factHeadline}</strong><p>{factCopy}</p></div>
        <dl><div><dt>Daily quest average</dt><dd>{(totalTasks / 7).toFixed(1)}</dd></div><div><dt>Active days</dt><dd>{activeDays}/7</dd></div><div><dt>Current streak</dt><dd>{history.streak}</dd></div></dl>
      </section>
    </div>
  );
}
