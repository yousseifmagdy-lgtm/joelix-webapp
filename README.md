# Joelix Video Game

Joelix is a mobile-first life-tracking game built with Next.js. It is prepared
for GitHub-to-Vercel deployment with Neon Postgres, Vercel Blob, USDA nutrition
search, and an OpenAI-powered coach.

## Deploy to Vercel

1. Import this GitHub repository into Vercel and keep the detected **Next.js** settings.
2. In **Storage**, connect a Neon Postgres database to provide `DATABASE_URL`.
3. Connect a Vercel Blob store to provide `BLOB_READ_WRITE_TOKEN`.
4. Add `OPENAI_API_KEY` and `USDA_API_KEY` under **Settings → Environment Variables**.
5. Optionally add `EDAMAM_APP_ID`, `EDAMAM_APP_KEY`, `OPENAI_MODEL`, and `JOELIX_USER_ID`.
6. Redeploy and open `/health`; configured services will show `true`.

Never commit real secret values. `.env.example` contains variable names only.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

## Local services, Codex OAuth, and LAN access

Joelix now starts two clearly separated local services with one command:

- Next.js serves the React app and normal Joelix API routes on port `3000`.
- `scripts/codex-bridge.mjs` serves only the local Codex OAuth coach bridge on port `3001`.

The local bridge can use the ChatGPT login managed by Codex. Vercel uses
`OPENAI_API_KEY` securely on the server instead.

Open Codex on the PC and sign in with ChatGPT, then start both services on all
local network interfaces:

```bash
npm run dev
```

On Windows, the easiest option is to double-click `START-JOELIX.cmd` in the
project folder. It finds the bundled Node.js and Codex programs automatically;
starts Joelix as a hidden background service, opens the website when both
services are ready, and restarts them after a crash. It also adds Joelix to the
current user's Windows sign-in startup list, so it starts automatically at the
next Windows sign-in. The command window closes after startup and Joelix
keeps running. If Joelix is already running, the launcher simply opens the
website. Startup, build, and service logs are kept in the project's `work`
folder for troubleshooting. If the coach is not connected yet, open **The
Best** and press **Connect ChatGPT**.

Health check URLs:

- Joelix app, local computer: `http://localhost:3000/health`
- Joelix app, local network: `http://192.168.100.173:3000/health`
- Codex bridge, local computer: `http://localhost:3001/health`
- Codex bridge, local network: `http://192.168.100.173:3001/health`

The Joelix API base URL on the local network is
`http://192.168.100.173:3000`. The browser continues to call the same-origin
`/api/coach` route; that server-side route forwards only coach requests to the
bridge on this PC.

To run the services separately for troubleshooting:

```bash
npm run frontend
npm run backend
```

The Codex bridge is local-only. It works for phones on the same network while
the PC, Codex login, and both Joelix services are running.

## USDA FoodData Central nutrition

Joelix uses the official USDA FoodData Central search API for calories, protein,
carbohydrates, and fat. The Foreign Agricultural Service Open Data API is not
used because it contains agricultural trade and commodity-production data, not
food nutrition.

The included USDA `DEMO_KEY` works immediately for light testing. For regular
use, request a free data.gov API key, copy `.dev.vars.example` to `.dev.vars`,
replace `DEMO_KEY` with your key, and restart Joelix. The private key is read
only by the server and is ignored by Git.

Official documentation: https://fdc.nal.usda.gov/api-guide

Joelix's same-origin endpoint is `GET /api/usda?q=banana`. Results are normalized
to 100 g, and the Food Log scales calories and macros to the exact gram portion
selected by the user. If the local server cannot reach USDA, the browser retries
with USDA's documented public demo key before showing clearly marked built-in
estimates.

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start Joelix and its local Codex OAuth bridge
- `npm run frontend`: start only the Joelix app on port 3000
- `npm run backend`: start only the Codex OAuth bridge on port 3001
- `START-JOELIX.cmd`: double-click Windows launcher for both local services
- `npm run build`: verify the Vercel-compatible Next.js production build
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
