import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let sqlClient: NeonQueryFunction<false, false> | null = null;
let schemaPromise: Promise<void> | null = null;

export function getPostgres() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured. Connect a Neon database in Vercel.");
  sqlClient ??= neon(databaseUrl);
  return sqlClient;
}

export async function ensurePostgresSchema() {
  if (schemaPromise) return schemaPromise;
  const sql = getPostgres();
  schemaPromise = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS player_profiles (
      user_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL DEFAULT '',
      player_tag TEXT NOT NULL DEFAULT '',
      primary_goal TEXT NOT NULL DEFAULT '',
      xp INTEGER NOT NULL DEFAULT 0,
      alarm_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      alarm_minutes INTEGER NOT NULL DEFAULT 60,
      game_state TEXT NOT NULL DEFAULT '{}',
      workout_state TEXT NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`;
    await sql`CREATE TABLE IF NOT EXISTS weight_entries (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      weight_kg DOUBLE PRECISION NOT NULL,
      logged_on DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`;
    await sql`CREATE INDEX IF NOT EXISTS weight_entries_user_date_idx ON weight_entries (user_id, logged_on DESC)`;
    await sql`CREATE TABLE IF NOT EXISTS mood_entries (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      label TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      logged_on DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`;
    await sql`CREATE INDEX IF NOT EXISTS mood_entries_user_date_idx ON mood_entries (user_id, logged_on DESC)`;
    await sql`CREATE TABLE IF NOT EXISTS wishlist_entries (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      target_amount DOUBLE PRECISION NOT NULL,
      category TEXT NOT NULL DEFAULT 'Future buy',
      added_on DATE NOT NULL,
      purchased BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`;
    await sql`CREATE INDEX IF NOT EXISTS wishlist_entries_user_idx ON wishlist_entries (user_id, created_at DESC)`;
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

export function requestUserId(request: Request) {
  return request.headers.get("oai-authenticated-user-email")
    || process.env.JOELIX_USER_ID?.trim()
    || "local-player";
}
