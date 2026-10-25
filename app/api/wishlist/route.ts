export const runtime = "nodejs";
export { GET, POST, PATCH, DELETE } from "./neon";

/* Legacy Cloudflare D1 implementation retained below for migration reference.
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { wishlistEntries } from "../../../db/schema";

function userId(request: Request) {
  return request.headers.get("oai-authenticated-user-email") || "local-player";
}

export async function GET(request: Request) {
  try {
    const rows = await getDb().select().from(wishlistEntries)
      .where(and(eq(wishlistEntries.userId, userId(request)), eq(wishlistEntries.purchased, false)))
      .orderBy(desc(wishlistEntries.createdAt), desc(wishlistEntries.id)).limit(40);
    return Response.json({ items: rows });
  } catch {
    return Response.json({ error: "Wishlist cloud save is not ready yet." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; targetAmount?: number; category?: string };
    const name = String(body.name || "").trim().slice(0, 100);
    const targetAmount = Number(body.targetAmount);
    if (!name || targetAmount <= 0 || targetAmount > 1_000_000) {
      return Response.json({ error: "Add an item name and a valid target price." }, { status: 400 });
    }
    const [item] = await getDb().insert(wishlistEntries).values({
      userId: userId(request), name, targetAmount,
      category: String(body.category || "Future buy").slice(0, 40),
      addedOn: new Date().toISOString().slice(0, 10),
    }).returning();
    return Response.json({ item }, { status: 201 });
  } catch {
    return Response.json({ error: "Wishlist cloud save is not ready yet." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id?: number; purchased?: boolean };
    const id = Number(body.id);
    if (!id) return Response.json({ error: "Missing wishlist item." }, { status: 400 });
    await getDb().update(wishlistEntries).set({ purchased: Boolean(body.purchased) })
      .where(and(eq(wishlistEntries.id, id), eq(wishlistEntries.userId, userId(request))));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Wishlist cloud save is not ready yet." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("all") === "1") {
      await getDb().delete(wishlistEntries).where(eq(wishlistEntries.userId, userId(request)));
      return Response.json({ ok: true });
    }
    const id = Number(url.searchParams.get("id"));
    if (!id) return Response.json({ error: "Missing wishlist item." }, { status: 400 });
    await getDb().delete(wishlistEntries)
      .where(and(eq(wishlistEntries.id, id), eq(wishlistEntries.userId, userId(request))));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Wishlist cloud save is not ready yet." }, { status: 503 });
  }
}
*/
