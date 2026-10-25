import { ensurePostgresSchema, getPostgres, requestUserId } from "../../../db/neon";

export const runtime = "nodejs";
type DbRow = Record<string, unknown>;

function parseState(value: unknown) {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

function stateJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try { return JSON.stringify(value); } catch { return null; }
}

function profileJson(row?: DbRow) {
  if (!row) return row;
  return {
    userId: row.user_id, displayName: row.display_name, playerTag: row.player_tag,
    primaryGoal: row.primary_goal, xp: Number(row.xp || 0), alarmEnabled: Boolean(row.alarm_enabled),
    alarmMinutes: Number(row.alarm_minutes || 60), updatedAt: row.updated_at,
  };
}

function weightJson(row: DbRow) {
  return { id: Number(row.id), userId: row.user_id, weightKg: Number(row.weight_kg), loggedOn: String(row.logged_on), createdAt: row.created_at };
}

function moodJson(row: DbRow) {
  return { id: Number(row.id), userId: row.user_id, score: Number(row.score), label: row.label, note: row.note, loggedOn: String(row.logged_on), createdAt: row.created_at };
}

async function ensureProfile(id: string) {
  await ensurePostgresSchema();
  const sql = getPostgres();
  await sql`INSERT INTO player_profiles (user_id) VALUES (${id}) ON CONFLICT (user_id) DO NOTHING`;
  return sql;
}

export async function GET(request: Request) {
  try {
    const id = requestUserId(request);
    const sql = await ensureProfile(id);
    const profiles = await sql`SELECT * FROM player_profiles WHERE user_id = ${id} LIMIT 1`;
    const profile = profiles[0] as DbRow | undefined;
    const weights = await sql`SELECT * FROM weight_entries WHERE user_id = ${id} ORDER BY logged_on DESC, id DESC LIMIT 30`;
    const moods = await sql`SELECT * FROM mood_entries WHERE user_id = ${id} ORDER BY logged_on DESC, id DESC LIMIT 14`;
    return Response.json({ profile: profileJson(profile), gameState: parseState(profile?.game_state), workoutState: parseState(profile?.workout_state), weights: weights.map((row) => weightJson(row as DbRow)), moods: moods.map((row) => moodJson(row as DbRow)) });
  } catch (error) {
    console.error("Wellness GET failed", error);
    return Response.json({ error: "Cloud save is not ready. Connect the Vercel database." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const id = requestUserId(request);
    const sql = await ensureProfile(id);
    const body = await request.json() as {
      action?: "weight" | "mood" | "xp" | "alarm" | "profile" | "game_state" | "workout_state" | "youtube_state";
      weightKg?: number; score?: number; label?: string; note?: string; amount?: number; enabled?: boolean; minutes?: number;
      displayName?: string; playerTag?: string; primaryGoal?: string; gameState?: unknown; workoutState?: unknown; youtubeState?: unknown;
    };
    const today = new Date().toISOString().slice(0, 10);

    if (body.action === "weight") {
      const weightKg = Number(body.weightKg);
      if (weightKg < 25 || weightKg > 400) return Response.json({ error: "Enter a weight from 25 to 400 kg." }, { status: 400 });
      const rows = await sql`INSERT INTO weight_entries (user_id, weight_kg, logged_on) VALUES (${id}, ${weightKg}, ${today}) RETURNING *`;
      return Response.json({ entry: weightJson(rows[0] as DbRow) });
    }
    if (body.action === "mood") {
      const score = Math.round(Number(body.score));
      if (score < 1 || score > 5) return Response.json({ error: "Choose a feeling first." }, { status: 400 });
      const label = String(body.label || "Checked in").slice(0, 30);
      const note = String(body.note || "").slice(0, 500);
      const rows = await sql`INSERT INTO mood_entries (user_id, score, label, note, logged_on) VALUES (${id}, ${score}, ${label}, ${note}, ${today}) RETURNING *`;
      return Response.json({ entry: moodJson(rows[0] as DbRow) });
    }
    if (body.action === "xp") {
      const amount = Math.max(0, Math.min(1000, Math.round(Number(body.amount) || 0)));
      await sql`UPDATE player_profiles SET xp = xp + ${amount}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ${id}`;
    } else if (body.action === "alarm") {
      const minutes = Math.max(15, Math.min(240, Math.round(Number(body.minutes) || 60)));
      await sql`UPDATE player_profiles SET alarm_enabled = ${Boolean(body.enabled)}, alarm_minutes = ${minutes}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ${id}`;
    } else if (body.action === "profile") {
      const displayName = String(body.displayName || "").trim().slice(0, 50);
      const playerTag = String(body.playerTag || "").trim().replace(/^@+/, "").slice(0, 24);
      const primaryGoal = String(body.primaryGoal || "").trim().slice(0, 160);
      await sql`UPDATE player_profiles SET display_name = ${displayName}, player_tag = ${playerTag}, primary_goal = ${primaryGoal}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ${id}`;
    } else if (body.action === "game_state" || body.action === "workout_state") {
      const json = stateJson(body.action === "game_state" ? body.gameState : body.workoutState);
      if (!json) return Response.json({ error: "Saved game data is invalid." }, { status: 400 });
      if (body.action === "game_state") await sql`UPDATE player_profiles SET game_state = ${json}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ${id}`;
      else await sql`UPDATE player_profiles SET workout_state = ${json}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ${id}`;
    } else if (body.action === "youtube_state") {
      const youtubeJson = stateJson(body.youtubeState);
      if (!youtubeJson) return Response.json({ error: "YouTube data is invalid." }, { status: 400 });
      const rows = await sql`SELECT game_state FROM player_profiles WHERE user_id = ${id} LIMIT 1`;
      const gameState = parseState((rows[0] as DbRow | undefined)?.game_state);
      const json = stateJson({ ...gameState, youtubeState: JSON.parse(youtubeJson) });
      if (!json) return Response.json({ error: "Saved game data is invalid." }, { status: 400 });
      await sql`UPDATE player_profiles SET game_state = ${json}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ${id}`;
      return Response.json({ ok: true });
    }
    const rows = await sql`SELECT * FROM player_profiles WHERE user_id = ${id} LIMIT 1`;
    return Response.json({ profile: profileJson(rows[0] as DbRow | undefined) });
  } catch (error) {
    console.error("Wellness POST failed", error);
    return Response.json({ error: "Cloud save is not ready. Connect the Vercel database." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = requestUserId(request);
    await ensurePostgresSchema();
    const sql = getPostgres();
    await sql`DELETE FROM weight_entries WHERE user_id = ${id}`;
    await sql`DELETE FROM mood_entries WHERE user_id = ${id}`;
    await sql`DELETE FROM player_profiles WHERE user_id = ${id}`;
    await sql`INSERT INTO player_profiles (user_id) VALUES (${id})`;
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Wellness DELETE failed", error);
    return Response.json({ error: "Cloud reset is not ready. Connect the Vercel database." }, { status: 503 });
  }
}
