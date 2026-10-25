import { ensurePostgresSchema, getPostgres, requestUserId } from "../../../db/neon";

export const runtime = "nodejs";
type DbRow = Record<string, unknown>;

function itemJson(row: DbRow) {
  return {
    id: Number(row.id), userId: row.user_id, name: row.name,
    targetAmount: Number(row.target_amount), category: row.category,
    addedOn: String(row.added_on), purchased: Boolean(row.purchased), createdAt: row.created_at,
  };
}

async function database() {
  await ensurePostgresSchema();
  return getPostgres();
}

export async function GET(request: Request) {
  try {
    const id = requestUserId(request);
    const sql = await database();
    const rows = await sql`SELECT * FROM wishlist_entries WHERE user_id = ${id} AND purchased = FALSE ORDER BY created_at DESC, id DESC LIMIT 40`;
    return Response.json({ items: rows.map((row) => itemJson(row as DbRow)) });
  } catch (error) {
    console.error("Wishlist GET failed", error);
    return Response.json({ error: "Wishlist cloud save is not ready. Connect the Vercel database." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; targetAmount?: number; category?: string };
    const name = String(body.name || "").trim().slice(0, 100);
    const targetAmount = Number(body.targetAmount);
    if (!name || targetAmount <= 0 || targetAmount > 1_000_000) return Response.json({ error: "Add an item name and a valid target price." }, { status: 400 });
    const id = requestUserId(request);
    const category = String(body.category || "Future buy").slice(0, 40);
    const addedOn = new Date().toISOString().slice(0, 10);
    const sql = await database();
    const rows = await sql`INSERT INTO wishlist_entries (user_id, name, target_amount, category, added_on) VALUES (${id}, ${name}, ${targetAmount}, ${category}, ${addedOn}) RETURNING *`;
    return Response.json({ item: itemJson(rows[0] as DbRow) }, { status: 201 });
  } catch (error) {
    console.error("Wishlist POST failed", error);
    return Response.json({ error: "Wishlist cloud save is not ready. Connect the Vercel database." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { id?: number; purchased?: boolean };
    const itemId = Number(body.id);
    if (!itemId) return Response.json({ error: "Missing wishlist item." }, { status: 400 });
    const id = requestUserId(request);
    const sql = await database();
    await sql`UPDATE wishlist_entries SET purchased = ${Boolean(body.purchased)} WHERE id = ${itemId} AND user_id = ${id}`;
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Wishlist PATCH failed", error);
    return Response.json({ error: "Wishlist cloud save is not ready. Connect the Vercel database." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = requestUserId(request);
    const sql = await database();
    if (url.searchParams.get("all") === "1") {
      await sql`DELETE FROM wishlist_entries WHERE user_id = ${id}`;
      return Response.json({ ok: true });
    }
    const itemId = Number(url.searchParams.get("id"));
    if (!itemId) return Response.json({ error: "Missing wishlist item." }, { status: 400 });
    await sql`DELETE FROM wishlist_entries WHERE id = ${itemId} AND user_id = ${id}`;
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Wishlist DELETE failed", error);
    return Response.json({ error: "Wishlist cloud save is not ready. Connect the Vercel database." }, { status: 503 });
  }
}
