export type AiCitation = { title: string; url: string };
export type AiHistoryMessage = { role: string; content: string };

type OutputAnnotation = { type?: string; url?: string; title?: string; url_citation?: { url?: string; title?: string } };
type OutputContent = { type?: string; text?: string; annotations?: OutputAnnotation[] };
type OutputItem = { type?: string; content?: OutputContent[] };
type ResponsesPayload = { output_text?: string; output?: OutputItem[]; error?: { message?: string } };

export function hasOpenAI() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function askOpenAI(options: { message: string; history?: AiHistoryMessage[]; instructions: string; webSearch?: boolean }) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const input = (options.history || []).slice(-6)
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) => ({ role: item.role, content: String(item.content || "").slice(0, 4_000) }));
  input.push({ role: "user", content: options.message.slice(0, 8_000) });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-6-astra",
      instructions: options.instructions,
      input,
      store: false,
      ...(options.webSearch === false ? {} : { tools: [{ type: "web_search", search_context_size: "low" }] }),
    }),
    signal: AbortSignal.timeout(55_000),
  });
  const payload = await response.json() as ResponsesPayload;
  if (!response.ok) throw new Error(payload.error?.message || `OpenAI returned ${response.status}.`);

  const text = payload.output_text || (payload.output || [])
    .flatMap((item) => item.type === "message" ? item.content || [] : [])
    .filter((content) => content.type === "output_text")
    .map((content) => content.text || "")
    .join("\n")
    .trim();
  if (!text) throw new Error("OpenAI returned an empty answer.");

  const citations = new Map<string, AiCitation>();
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      for (const annotation of content.annotations || []) {
        const url = annotation.url || annotation.url_citation?.url;
        const title = annotation.title || annotation.url_citation?.title || url;
        if (url && /^https:\/\//i.test(url)) citations.set(url, { title: title || url, url });
      }
    }
  }
  return { answer: text, citations: [...citations.values()] };
}
