export const runtime = "nodejs";
export { GET, POST, DELETE } from "./neon";

/* Legacy Cloudflare D1 implementation retained below for migration reference.
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { moodEntries, playerProfiles, weightEntries } from "../../../db/schema";

function userId(request: Request) {
  return request.headers.get("oai-authenticated-user-email") || "local-player";
}

async function ensureProfile(id: string) {
  const db = getDb();
  await db.insert(playerProfiles).values({ userId: id }).onConflictDoNothing();
  return db;
}

function parseState(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function stateJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const id = userId(request);
    const db = await ensureProfile(id);
    const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, id)).limit(1);
    const weights = await db.select().from(weightEntries).where(eq(weightEntries.userId, id)).orderBy(desc(weightEntries.loggedOn), desc(weightEntries.id)).limit(30);
    const moods = await db.select().from(moodEntries).where(eq(moodEntries.userId, id)).orderBy(desc(moodEntries.loggedOn), desc(moodEntries.id)).limit(14);
    return Response.json({
      profile: profile ? { ...profile, gameState: undefined, workoutState: undefined } : profile,
      gameState: parseState(profile?.gameState),
      workoutState: parseState(profile?.workoutState),
      weights,
      moods,
    });
  } catch {
    return Response.json({ error: "Cloud save is not ready yet." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const id = userId(request);
    const db = await ensureProfile(id);
    const body = (await request.json()) as {
      action?: "weight" | "mood" | "xp" | "alarm" | "profile" | "game_state" | "workout_state" | "youtube_state";
      weightKg?: number;
      score?: number;
      label?: string;
      note?: string;
      amount?: number;
      enabled?: boolean;
      minutes?: number;
      displayName?: string;
      playerTag?: string;
      primaryGoal?: string;
      gameState?: unknown;
      workoutState?: unknown;
      youtubeState?: unknown;
    };
    const today = new Date().toISOString().slice(0, 10);

    if (body.action === "weight") {
      const weightKg = Number(body.weightKg);
      if (weightKg < 25 || weightKg > 400) return Response.json({ error: "Enter a weight from 25 to 400 kg." }, { status: 400 });
      const [entry] = await db.insert(weightEntries).values({ userId: id, weightKg, loggedOn: today }).returning();
      return Response.json({ entry });
    }

    if (body.action === "mood") {
      const score = Math.round(Number(body.score));
      if (score < 1 || score > 5) return Response.json({ error: "Choose a feeling first." }, { status: 400 });
      const [entry] = await db.insert(moodEntries).values({
        userId: id,
        score,
        label: String(body.label || "Checked in").slice(0, 30),
        note: String(body.note || "").slice(0, 500),
        loggedOn: today,
      }).returning();
      return Response.json({ entry });
    }

    if (body.action === "xp") {
      const amount = Math.max(0, Math.min(1000, Math.round(Number(body.amount) || 0)));
      await db.update(playerProfiles).set({ xp: sql`${playerProfiles.xp} + ${amount}`, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(playerProfiles.userId, id));
    }

    if (body.action === "alarm") {
      const minutes = Math.max(15, Math.min(240, Math.round(Number(body.minutes) || 60)));
      await db.update(playerProfiles).set({ alarmEnabled: Boolean(body.enabled), alarmMinutes: minutes, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(playerProfiles.userId, id));
    }

    if (body.action === "profile") {
      await db.update(playerProfiles).set({
        displayName: String(body.displayName || "").trim().slice(0, 50),
        playerTag: String(body.playerTag || "").trim().replace(/^@+/, "").slice(0, 24),
        primaryGoal: String(body.primaryGoal || "").trim().slice(0, 160),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      }).where(eq(playerProfiles.userId, id));
    }

    if (body.action === "game_state" || body.action === "workout_state") {
      const json = stateJson(body.action === "game_state" ? body.gameState : body.workoutState);
      if (!json) return Response.json({ error: "Saved game data is invalid or too large." }, { status: 400 });
      await db.update(playerProfiles).set(body.action === "game_state"
        ? { gameState: json, updatedAt: sql`CURRENT_TIMESTAMP` }
        : { workoutState: json, updatedAt: sql`CURRENT_TIMESTAMP` }
      ).where(eq(playerProfiles.userId, id));
    }

    if (body.action === "youtube_state") {
      const youtubeJson = stateJson(body.youtubeState);
      if (!youtubeJson) return Response.json({ error: "YouTube data is invalid or too large." }, { status: 400 });
      const [current] = await db.select({ gameState: playerProfiles.gameState }).from(playerProfiles).where(eq(playerProfiles.userId, id)).limit(1);
      const gameState = parseState(current?.gameState);
      const json = stateJson({ ...gameState, youtubeState: JSON.parse(youtubeJson) });
      if (!json) return Response.json({ error: "Saved game data is too large." }, { status: 400 });
      await db.update(playerProfiles).set({ gameState: json, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(playerProfiles.userId, id));
      return Response.json({ ok: true });
    }

    const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, id)).limit(1);
    return Response.json({ profile });
  } catch {
    return Response.json({ error: "Cloud save is not ready yet." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = userId(request);
    const db = getDb();
    await db.delete(weightEntries).where(eq(weightEntries.userId, id));
    await db.delete(moodEntries).where(eq(moodEntries.userId, id));
    await db.delete(playerProfiles).where(eq(playerProfiles.userId, id));
    await db.insert(playerProfiles).values({ userId: id });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Cloud reset is not ready yet." }, { status: 503 });
  }
}
*/
