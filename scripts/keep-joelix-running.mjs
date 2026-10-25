import { spawn } from "node:child_process";
import { appendFileSync, closeSync, mkdirSync, openSync, renameSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workRoot = resolve(projectRoot, "work");
const serviceScript = resolve(projectRoot, "scripts", "dev.mjs");
const outputLog = resolve(workRoot, "joelix-service.log");
const errorLog = resolve(workRoot, "joelix-service-error.log");
let child = null;
let stopping = false;
let restartTimer = null;
let consecutiveFailures = 0;
let startedAt = 0;

mkdirSync(workRoot, { recursive: true });

function rotateLog(path) {
  try {
    if (statSync(path).size > 1_000_000) renameSync(path, `${path}.old`);
  } catch {
    // A missing or locked log does not stop Joelix.
  }
}

rotateLog(outputLog);
rotateLog(errorLog);
const outputHandle = openSync(outputLog, "a");
const errorHandle = openSync(errorLog, "a");

function log(message) {
  appendFileSync(outputLog, `[${new Date().toISOString()}] ${message}\n`);
}

function scheduleRestart(reason) {
  if (stopping || restartTimer) return;
  const runtime = Date.now() - startedAt;
  consecutiveFailures = runtime > 30_000 ? 0 : Math.min(consecutiveFailures + 1, 5);
  const delay = Math.min(15_000, 2_000 * Math.max(1, consecutiveFailures));
  child = null;
  log(`${reason} Restarting in ${delay / 1000} seconds.`);
  restartTimer = setTimeout(() => {
    restartTimer = null;
    start();
  }, delay);
}

function start() {
  startedAt = Date.now();
  log("Starting the Joelix Next.js service on ports 3000 and 3001.");
  child = spawn(process.execPath, [serviceScript], {
    cwd: projectRoot,
    env: process.env,
    stdio: ["ignore", outputHandle, errorHandle],
    windowsHide: true,
  });
  child.once("error", (error) => scheduleRestart(`Start failed: ${error.message}`));
  child.once("exit", (code, signal) => scheduleRestart(`Joelix stopped (code ${code ?? "none"}, signal ${signal ?? "none"}).`));
}

function stop() {
  stopping = true;
  if (restartTimer) clearTimeout(restartTimer);
  if (child && !child.killed) child.kill();
  log("Joelix watcher stopped.");
  setTimeout(() => {
    closeSync(outputHandle);
    closeSync(errorHandle);
    process.exit(0);
  }, 250);
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
start();
