import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startCodexBridge } from "./codex-bridge.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nextCliPath = join(projectRoot, "node_modules", "next", "dist", "bin", "next");

function frontendEnvironment() {
  const environment = { ...process.env };
  delete environment.OPENAI_API_KEY;
  delete environment.CODEX_API_KEY;
  delete environment.DASHSCOPE_API_KEY;
  return environment;
}

async function main() {
  const bridge = await startCodexBridge();
  const frontend = spawn(process.execPath, [nextCliPath, "dev", "--hostname", "0.0.0.0", "--port", "3000"], {
    cwd: projectRoot,
    env: frontendEnvironment(),
    stdio: "inherit",
    windowsHide: true,
  });

  console.log(`Joelix Codex OAuth bridge: http://localhost:${bridge.port}/health`);

  let closing = false;
  const shutdown = async (exitCode = 0) => {
    if (closing) return;
    closing = true;
    if (!frontend.killed) frontend.kill();
    await bridge.close();
    process.exit(exitCode);
  };

  frontend.on("error", (error) => { console.error(error.message); void shutdown(1); });
  frontend.on("exit", (code) => { void shutdown(code ?? 0); });
  process.once("SIGINT", () => { void shutdown(0); });
  process.once("SIGTERM", () => { void shutdown(0); });
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
