#!/usr/bin/env node
/**
 * dev-full.mjs — Starts gateway (backend) + UI (frontend) together.
 *
 * Gateway runs on port 18789, UI on port 5173.
 * Ctrl-C stops both processes.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const children = [];

function prefix(name, color) {
  const colors = { cyan: "\x1b[36m", magenta: "\x1b[35m", reset: "\x1b[0m" };
  const c = colors[color] ?? colors.reset;
  return `${c}[${name}]${colors.reset}`;
}

function launch(name, cmd, args, env, color) {
  const child = spawn(cmd, args, {
    cwd: repoRoot,
    env: { ...process.env, ...env, FORCE_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const tag = prefix(name, color);

  for (const stream of [child.stdout, child.stderr]) {
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        process.stdout.write(`${tag} ${line}\n`);
      }
    });
    stream.on("end", () => {
      if (buffer) {
        process.stdout.write(`${tag} ${buffer}\n`);
      }
    });
  }

  child.on("exit", (code, signal) => {
    process.stdout.write(`${tag} exited (code=${code}, signal=${signal})\n`);
  });

  children.push(child);
  return child;
}

// Gateway backend (port 18789)
launch(
  "gateway",
  "node",
  ["scripts/run-node.mjs", "--dev", "gateway"],
  {
    OPENCLAW_SKIP_CHANNELS: "1",
    CLAWDBOT_SKIP_CHANNELS: "1",
  },
  "cyan",
);

// UI frontend (port 5173)
launch("ui", "node", ["scripts/ui.js", "dev"], {}, "magenta");

process.stdout.write("\n\x1b[1m🚀 TroyAgent dev stack starting...\x1b[0m\n");
process.stdout.write("   Gateway: http://localhost:18789\n");
process.stdout.write("   UI:      http://localhost:5173\n\n");

function cleanup() {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
