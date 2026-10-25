import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const playerProfiles = sqliteTable("player_profiles", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull().default(""),
  playerTag: text("player_tag").notNull().default(""),
  primaryGoal: text("primary_goal").notNull().default(""),
  xp: integer("xp").notNull().default(0),
  alarmEnabled: integer("alarm_enabled", { mode: "boolean" }).notNull().default(false),
  alarmMinutes: integer("alarm_minutes").notNull().default(60),
  gameState: text("game_state").notNull().default("{}"),
  workoutState: text("workout_state").notNull().default("{}"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const weightEntries = sqliteTable("weight_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  weightKg: real("weight_kg").notNull(),
  loggedOn: text("logged_on").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const moodEntries = sqliteTable("mood_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  score: integer("score").notNull(),
  label: text("label").notNull(),
  note: text("note").notNull().default(""),
  loggedOn: text("logged_on").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const wishlistEntries = sqliteTable("wishlist_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  targetAmount: real("target_amount").notNull(),
  category: text("category").notNull().default("Future buy"),
  addedOn: text("added_on").notNull(),
  purchased: integer("purchased", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
