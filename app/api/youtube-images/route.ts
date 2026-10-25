export const runtime = "nodejs";
export const maxDuration = 60;
export { GET, POST, DELETE } from "./vercel";

/* Legacy Cloudflare R2 implementation retained below for migration reference.
import { env } from "cloudflare:workers";

function userId(request: Request) {
  return request.headers.get("oai-authenticated-user-email") || "local-player";
}

async function userPrefix(request: Request) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId(request)));
  const shortHash = Array.from(new Uint8Array(digest)).slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `youtube/${shortHash}/`;
}

function extensionFor(contentType: string) {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };
  return extensions[contentType.toLowerCase()] || "img";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File) || !image.type.startsWith("image/")) {
      return Response.json({ error: "Choose a valid image file." }, { status: 400 });
    }
    const prefix = await userPrefix(request);
    const key = `${prefix}${crypto.randomUUID()}.${extensionFor(image.type)}`;
    await env.UPLOADS.put(key, image.stream(), {
      httpMetadata: { contentType: image.type },
      customMetadata: { filename: image.name.slice(0, 180) },
    });
    return Response.json({ key, url: `/api/youtube-images?key=${encodeURIComponent(key)}` });
  } catch {
    return Response.json({ error: "The image store is not ready yet." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key") || "";
    const prefix = await userPrefix(request);
    if (!key.startsWith(prefix)) return Response.json({ error: "Image not found." }, { status: 404 });
    const object = await env.UPLOADS.get(key);
    if (!object) return Response.json({ error: "Image not found." }, { status: 404 });
    const filename = object.customMetadata?.filename || "youtube-note-image";
    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
        "Content-Length": String(object.size),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
        ETag: object.httpEtag,
      },
    });
  } catch {
    return Response.json({ error: "The image could not be loaded." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const prefix = await userPrefix(request);
    if (url.searchParams.get("all") === "1") {
      let cursor: string | undefined;
      do {
        const page = await env.UPLOADS.list({ prefix, cursor });
        if (page.objects.length) await env.UPLOADS.delete(page.objects.map((object: { key: string }) => object.key));
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
      return Response.json({ ok: true });
    }
    const key = url.searchParams.get("key") || "";
    if (!key.startsWith(prefix)) return Response.json({ error: "Image not found." }, { status: 404 });
    await env.UPLOADS.delete(key);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "The image could not be removed." }, { status: 503 });
  }
}
*/
