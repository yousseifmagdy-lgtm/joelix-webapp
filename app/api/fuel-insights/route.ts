import { askOpenAI, hasOpenAI } from "../_lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const CODEX_BRIDGE_URL = "http://127.0.0.1:3001";

type FuelSummary = {
  targets?: { calories?: number; protein?: number; carbs?: number; fat?: number };
  days?: Array<{ date?: string; calories?: number; protein?: number; carbs?: number; fat?: number }>;
};

function localSuggestions(summary: FuelSummary) {
  const target = Math.max(1, Number(summary.targets?.calories) || 1900);
  const proteinTarget = Math.max(1, Number(summary.targets?.protein) || 180);
  const logged = (summary.days || []).filter((day) => Number(day.calories) > 0);
  if (!logged.length) return [
    "Log at least one full day before changing the menu; incomplete days can make patterns misleading.",
    "Build each main meal around a protein source, then add produce and a measured carbohydrate or fat portion.",
    "Weigh repeat foods in grams so the next seven-day comparison is more reliable.",
  ];
  const average = logged.reduce((sum, day) => sum + Number(day.calories || 0), 0) / logged.length;
  const lowProtein = logged.filter((day) => Number(day.protein || 0) < proteinTarget * .9).length;
  const targetDays = logged.filter((day) => Math.abs(Number(day.calories || 0) - target) <= target * .1).length;
  return [
    average > target * 1.1
      ? `Average intake was ${Math.round(average - target)} kcal above target. Reduce one repeat portion while keeping regular meals.`
      : average < target * .9
        ? `Average intake was ${Math.round(target - average)} kcal below target. If unintentional, add a planned balanced snack.`
        : `Average intake stayed close to the ${target} kcal target. Repeat the meal structure that made this easiest.`,
    lowProtein
      ? `Protein was below 90% of target on ${lowProtein} logged day${lowProtein === 1 ? "" : "s"}. Spread protein across multiple meals.`
      : "Protein reached at least 90% of target on every logged day. Keep the distribution and portion sizes consistent.",
    `${targetDays} of ${logged.length} logged days were within 10% of target. Pre-plan the meal with the greatest portion variation.`,
  ];
}

function cleanSuggestions(answer: string) {
  const lines = answer.split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((line) => line.length > 20);
  if (lines.length >= 3) return lines.slice(0, 3);
  const sentences = answer.split(/(?<=[.!?])\s+/).map((line) => line.trim()).filter((line) => line.length > 20);
  return sentences.slice(0, 3);
}

export async function POST(request: Request) {
  let summary: FuelSummary;
  try {
    summary = (await request.json()) as FuelSummary;
  } catch {
    return Response.json({ error: "Send a valid seven-day nutrition summary." }, { status: 400 });
  }

  const fallback = localSuggestions(summary);
  const prompt = [
    "You are the nutrition review assistant inside Joelix Fuel.",
    "Review the structured seven-day calorie and macro data below.",
    "Return exactly 3 concise, practical bullet points.",
    "Use cautious general nutrition education only: no diagnosis, treatment, supplements, extreme restriction, or guaranteed outcomes.",
    "Call out consistency, calories, and protein when the data supports it. Mention incomplete logging if needed.",
    JSON.stringify(summary),
  ].join("\n");

  try {
    if (hasOpenAI()) {
      const result = await askOpenAI({
        message: prompt,
        instructions: "Return exactly three concise, practical nutrition review bullet points. Use cautious general education only; do not diagnose, prescribe treatment or supplements, or recommend extreme restriction.",
        webSearch: false,
      });
      const suggestions = cleanSuggestions(result.answer);
      return Response.json({ suggestions: suggestions.length === 3 ? suggestions : fallback, live: true }, { headers: { "Cache-Control": "no-store" } });
    }
    const response = await fetch(`${CODEX_BRIDGE_URL}/coach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, history: [] }),
      signal: AbortSignal.timeout(155_000),
    });
    const data = await response.json() as { answer?: string; live?: boolean; error?: string };
    if (!response.ok || !data.answer) throw new Error(data.error || "AI review unavailable.");
    const suggestions = cleanSuggestions(data.answer);
    return Response.json({ suggestions: suggestions.length === 3 ? suggestions : fallback, live: Boolean(data.live) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ suggestions: fallback, live: false, notice: "Using the local evidence-based review until The Best reconnects." }, { headers: { "Cache-Control": "no-store" } });
  }
}
