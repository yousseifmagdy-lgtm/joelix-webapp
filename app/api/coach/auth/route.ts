const CODEX_BRIDGE_URL = "http://127.0.0.1:3001";

export async function POST() {
  if (process.env.OPENAI_API_KEY?.trim()) {
    return Response.json({ error: "Live AI is already configured on the server; browser sign-in is not required." }, { status: 409 });
  }
  try {
    const response = await fetch(`${CODEX_BRIDGE_URL}/auth/start`, {
      method: "POST",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    const data = await response.json() as { authUrl?: string; loginId?: string | null; error?: string };
    if (!response.ok || !data.authUrl) {
      return Response.json({ error: data.error || "Codex could not start ChatGPT sign-in." }, { status: 503 });
    }
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "The Codex bridge is not running." }, { status: 503 });
  }
}
