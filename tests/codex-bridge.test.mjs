import assert from "node:assert/strict";
import test from "node:test";
import { startCodexBridge } from "../scripts/codex-bridge.mjs";

test("Codex bridge exposes health separately from OAuth state", async () => {
  const bridge = await startCodexBridge({ host: "127.0.0.1", port: 0, networkRestricted: true });
  try {
    const response = await fetch(`http://127.0.0.1:${bridge.port}/health`);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.status, "ok");
    assert.equal(data.service, "joelix-codex-oauth-bridge");
    assert.equal(typeof data.codex.oauthConnected, "boolean");
    assert.equal(data.codex.networkRestricted, true);
    assert.match(data.codex.error, /START-JOELIX\.cmd/);
  } finally {
    await bridge.close();
  }
});
