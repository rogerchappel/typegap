import { readFile } from "node:fs/promises";

const tasks = await readFile(new URL("../docs/TASKS.md", import.meta.url), "utf8");
const prd = await readFile(new URL("../docs/PRD.md", import.meta.url), "utf8");

const implementedTasks = [
  "Set up package.json",
  "Create src/cli.ts",
  "Use @typescript-eslint/typescript-estree",
  "Calculate type coverage percentage",
  "JSON output mode",
  "Main command: scan directory",
  "Integration test for CLI",
  "Run vitest",
];

const staleTasks = implementedTasks.filter((label) =>
  tasks.split("\n").some((line) => line.startsWith("- [ ]") && line.includes(label)),
);

if (staleTasks.length > 0) {
  throw new Error(`Implemented capabilities are still marked incomplete: ${staleTasks.join(", ")}`);
}

if (/^Status:\s*in-progress\s*$/im.test(prd)) {
  throw new Error("PRD still reports the implemented MVP as in progress");
}

console.log("Task and PRD status documentation is current.");
