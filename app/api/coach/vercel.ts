import { askOpenAI, hasOpenAI, type AiCitation } from "../_lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const CODEX_BRIDGE_URL = "http://127.0.0.1:3001";
const fallbackSources: AiCitation[] = [
  { title: "CDC adult physical activity guidance", url: "https://www.cdc.gov/physical-activity-basics/guidelines/adults.html" },
  { title: "CFPB savings research", url: "https://www.consumerfinance.gov/data-research/research-reports/consumer-savings-app-strategies-and-savings-outcomes/" },
  { title: "SBA market research guide", url: "https://www.sba.gov/business-guide/plan-your-business/market-research-competitive-analysis" },
];

function offlineCoach(question: string) {
  const lower = question.toLowerCase();
  if (/pain|injur|chest|faint|diagnos|medicine|medical/.test(lower)) return "I can give general education, but symptoms or injuries need a qualified clinician. Stop exercise for chest pain, fainting, or severe symptoms and seek urgent local care.";
  if (/money|income|client|business|freelance|earn|job|sell/.test(lower)) return "Pick one skill you can sell this week, define one specific outcome, then contact five realistic buyers. Ask two prospects what problem costs them time or money and track replies as a work quest.";
  if (/workout|exercise|run|strength|gym|muscle|cardio/.test(lower)) return "Use a repeatable baseline: 20–30 minutes of moderate movement today, plus two full-body strength sessions across the week. Start below your maximum and increase gradually.";
  return "For health today: protect sleep, add a short walk, and choose a meal with protein and plants. For money today: complete one task tied directly to a customer, job, or useful skill.";
}

export async function GET() {
  if (hasOpenAI()) return Response.json({ connected: true, available: true, provider: "openai-responses" }, { headers: { "Cache-Control": "no-store" } });
  try {
    const response = await fetch(`${CODEX_BRIDGE_URL}/health`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8_000) });
    const data = await response.json() as { codex?: { available?: boolean; oauthConnected?: boolean; authMode?: string | null; planType?: string | null; networkRestricted?: boolean; error?: string } };
    return Response.json({ connected: Boolean(response.ok && data.codex?.oauthConnected), available: Boolean(response.ok && data.codex?.available), provider: "codex-oauth", authMode: data.codex?.authMode ?? null, planType: data.codex?.planType ?? null, networkRestricted: Boolean(data.codex?.networkRestricted), notice: data.codex?.error }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ connected: false, available: false, provider: "offline", notice: "Set OPENAI_API_KEY in Vercel to enable live answers." }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  let payload: { message?: string; history?: Array<{ role: string; content: string }> };
  try { payload = await request.json() as typeof payload; }
  catch { return Response.json({ error: "Send a valid JSON request." }, { status: 400 }); }
  const message = payload.message?.trim() || "";
  if (!message) return Response.json({ error: "Write a question first." }, { status: 400 });

  try {
    if (hasOpenAI()) {
      const result = await askOpenAI({
        message,
        history: payload.history,
        webSearch: true,
        instructions: "You are The Best, Joelix's practical coach. Answer only legitimate money-making, general health education, nutrition, and workout questions. Use current web sources when useful and be concise. Never promise income, diagnose, prescribe treatment, or encourage extreme diets. For urgent symptoms, advise local professional care.",
      });
      return Response.json({ ...result, live: true, provider: "openai-responses" }, { headers: { "Cache-Control": "no-store" } });
    }
    const response = await fetch(`${CODEX_BRIDGE_URL}/coach`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: message.slice(0, 2_000), history: (payload.history || []).slice(-6) }), signal: AbortSignal.timeout(55_000) });
    const data = await response.json() as { answer?: string; citations?: AiCitation[]; error?: string; live?: boolean; provider?: string };
    if (!response.ok) throw new Error(data.error || "The local coach is unavailable.");
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ answer: offlineCoach(message), citations: fallbackSources, live: false, provider: "offline", notice: error instanceof Error ? error.message : "Live AI is unavailable." }, { headers: { "Cache-Control": "no-store" } });
  }
}
