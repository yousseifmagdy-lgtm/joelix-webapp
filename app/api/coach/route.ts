export const runtime = "nodejs";
export const maxDuration = 60;
export { GET, POST } from "./vercel";

/* Legacy local-only coach implementation retained below for migration reference.
type Citation = { title: string; url: string };

const CODEX_BRIDGE_URL = "http://127.0.0.1:3001";
const fallbackSources: Citation[] = [
  { title: "CDC adult physical activity guidance", url: "https://www.cdc.gov/physical-activity-basics/guidelines/adults.html" },
  { title: "CFPB savings rules research", url: "https://www.consumerfinance.gov/data-research/research-reports/consumer-savings-app-strategies-and-savings-outcomes/" },
  { title: "SBA market research guide", url: "https://www.sba.gov/business-guide/plan-your-business/market-research-competitive-analysis" },
];

function offlineCoach(question: string) {
  const lower = question.toLowerCase();
  if (/pain|injur|chest|faint|diagnos|medicine|medical/.test(lower)) {
    return "I can give general education, but symptoms or injuries need a qualified clinician. Stop exercise for chest pain, fainting, or severe symptoms and seek urgent local care. For a safe next step, choose gentle movement only if it feels comfortable.";
  }
  if (/money|income|client|business|freelance|earn|job|sell/.test(lower)) {
    return "Pick one skill you can sell this week, define one specific outcome, then contact five realistic buyers. Before building more, ask two prospects what problem costs them time or money. Track replies as a work quest; do not treat speculative investing or guaranteed-return claims as an income plan.";
  }
  if (/workout|exercise|run|strength|gym|muscle|cardio/.test(lower)) {
    return "Use a repeatable baseline: 20–30 minutes of moderate movement today, plus two full-body strength sessions across the week. Start below your maximum, keep technique clean, and increase time or resistance gradually. Recovery and pain-free consistency beat one extreme session.";
  }
  return "For health today: protect sleep, add a short walk, and choose a meal with protein and plants. For money today: complete one task tied directly to a customer, job, or useful skill. Ask me a specific money, health, or workout question and I’ll keep the answer in that lane.";
}

export async function GET() {
  try {
    const response = await fetch(`${CODEX_BRIDGE_URL}/health`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    const data = await response.json() as {
      codex?: { available?: boolean; oauthConnected?: boolean; authMode?: string | null; planType?: string | null; networkRestricted?: boolean; error?: string };
    };
    return Response.json({
      connected: Boolean(response.ok && data.codex?.oauthConnected),
      available: Boolean(response.ok && data.codex?.available),
      provider: "codex-oauth",
      authMode: data.codex?.authMode ?? null,
      planType: data.codex?.planType ?? null,
      networkRestricted: Boolean(data.codex?.networkRestricted),
      notice: data.codex?.error,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({
      connected: false,
      available: false,
      provider: "codex-oauth",
      authMode: null,
      planType: null,
      networkRestricted: false,
      notice: "The Codex OAuth bridge is not running. Start Joelix with npm run dev.",
    }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  let payload: { message?: string; history?: Array<{ role: string; content: string }> };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Send a valid JSON request." }, { status: 400 });
  }

  const message = payload.message?.trim() ?? "";
  if (!message) return Response.json({ error: "Write a question first." }, { status: 400 });

  try {
    const response = await fetch(`${CODEX_BRIDGE_URL}/coach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.slice(0, 2_000), history: (payload.history ?? []).slice(-6) }),
      signal: AbortSignal.timeout(155_000),
    });
    const data = await response.json() as { answer?: string; citations?: Citation[]; error?: string; live?: boolean; provider?: string };
    if (!response.ok) throw new Error(data.error || "Codex OAuth is unavailable.");
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({
      answer: offlineCoach(message),
      citations: fallbackSources,
      live: false,
      provider: "offline",
      notice: error instanceof Error ? error.message : "Codex OAuth is unavailable.",
    }, { headers: { "Cache-Control": "no-store" } });
  }
}
*/
