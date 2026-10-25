/** Minimal local type surface for the Cloudflare bindings used by Joelix. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cloudflare supplies the concrete D1 runtime type.
type D1Database = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cloudflare supplies the concrete R2 runtime type.
type R2Bucket = any;

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

declare module "cloudflare:workers" {
  export const env: {
    DB: D1Database;
    UPLOADS: R2Bucket;
    OPENAI_API_KEY?: string;
    USDA_API_KEY?: string;
    [key: string]: unknown;
  };
}
