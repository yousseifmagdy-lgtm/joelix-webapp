export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    status: "ok",
    app: "Joelix Video Game",
    platform: process.env.VERCEL ? "vercel" : "local",
    services: {
      database: Boolean(process.env.DATABASE_URL),
      imageStorage: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      ai: Boolean(process.env.OPENAI_API_KEY),
      usda: Boolean(process.env.USDA_API_KEY),
    },
    timestamp: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
