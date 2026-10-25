import { del, list, put } from "@vercel/blob";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const runtime = "nodejs";
export const maxDuration = 60;

function userId(request: Request) {
  return request.headers.get("oai-authenticated-user-email") || process.env.JOELIX_USER_ID?.trim() || "local-player";
}

async function userPrefix(request: Request) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId(request)));
  const hash = Array.from(new Uint8Array(digest)).slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `youtube/${hash}/`;
}

function extensionFor(type: string) {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" } as Record<string, string>)[type.toLowerCase()] || "img";
}

function mimeForKey(key: string) {
  const extension = key.split(".").pop()?.toLowerCase();
  return ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif" } as Record<string, string>)[extension || ""] || "application/octet-stream";
}

function localPath(key: string) {
  return join(process.cwd(), "public", "uploads", ...key.split("/"));
}

function ownedBlobUrl(value: string, prefix: string) {
  try {
    const url = new URL(value);
    const path = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com") && path.startsWith(prefix) ? url : null;
  } catch { return null; }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File) || !image.type.startsWith("image/")) return Response.json({ error: "Choose a valid image file." }, { status: 400 });
    const prefix = await userPrefix(request);
    const key = `${prefix}${crypto.randomUUID()}.${extensionFor(image.type)}`;
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (token) {
      const blob = await put(key, image, { access: "public", addRandomSuffix: false, contentType: image.type, token });
      return Response.json({ key: blob.url, url: blob.url });
    }
    const path = localPath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, Buffer.from(await image.arrayBuffer()));
    return Response.json({ key, url: `/uploads/${key}` });
  } catch (error) {
    console.error("YouTube image upload failed", error);
    return Response.json({ error: "The image store is not ready. Connect Vercel Blob and try again." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  try {
    const key = new URL(request.url).searchParams.get("key") || "";
    const prefix = await userPrefix(request);
    if (!key.startsWith(prefix)) return Response.json({ error: "Image not found." }, { status: 404 });
    const body = await readFile(localPath(key));
    return new Response(body, { headers: { "Content-Type": mimeForKey(key), "Cache-Control": "private, max-age=3600" } });
  } catch {
    return Response.json({ error: "Image not found." }, { status: 404 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const prefix = await userPrefix(request);
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (url.searchParams.get("all") === "1") {
      if (token) {
        let cursor: string | undefined;
        do {
          const page = await list({ prefix, cursor, token, limit: 1000 });
          if (page.blobs.length) await del(page.blobs.map((blob) => blob.url), { token });
          cursor = page.hasMore ? page.cursor : undefined;
        } while (cursor);
      } else {
        await rm(join(process.cwd(), "public", "uploads", ...prefix.split("/")), { recursive: true, force: true });
      }
      return Response.json({ ok: true });
    }
    const key = url.searchParams.get("key") || "";
    const remote = ownedBlobUrl(key, prefix);
    if (remote && token) await del(remote.href, { token });
    else if (key.startsWith(prefix)) await rm(localPath(key), { force: true });
    else return Response.json({ error: "Image not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("YouTube image delete failed", error);
    return Response.json({ error: "The image could not be removed." }, { status: 503 });
  }
}
