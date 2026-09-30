import { spawn } from "node:child_process";
import process from "node:process";

/**
 * Runs the API and the Vite dev server together with a single command.
 * No extra dependencies: each child is just `npm run dev` in its own folder.
 */

const targets = [
  { name: "api", cwd: "server", colour: "[36m" },
  { name: "web", cwd: "client", colour: "[35m" },
];

const RESET = "[0m";
const children = [];
let shuttingDown = false;

const prefix = (name, colour, chunk) => {
  const text = chunk.toString();
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => `${colour}[${name}]${RESET} ${line}`)
    .join("\n");
};

for (const target of targets) {
  const child = spawn("npm", ["run", "dev"], {
    cwd: new URL(`../${target.cwd}/`, import.meta.url),
    shell: true,
    env: process.env,
  });

  child.stdout.on("data", (chunk) => console.log(prefix(target.name, target.colour, chunk)));
  child.stderr.on("data", (chunk) => console.error(prefix(target.name, target.colour, chunk)));

  child.on("exit", (code) => {
    if (shuttingDown) return;
    console.log(`\n[dev] ${target.name} exited (${code}) — stopping everything.`);
    shutdown(code ?? 0);
  });

  children.push(child);
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 500);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log(
  "\n[dev] API  -> http://localhost:3000\n[dev] Web  -> http://localhost:5173\n[dev] Press Ctrl+C to stop both.\n",
);
