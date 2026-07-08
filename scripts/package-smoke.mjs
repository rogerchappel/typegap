import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
  encoding: "utf8",
});

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const [packument] = JSON.parse(result.stdout);
const packedFiles = new Set(packument.files.map((file) => file.path));

const requiredFiles = [
  "dist/cli.js",
  "dist/index.js",
  "dist/analyzer.js",
  "dist/parser.js",
  "dist/reporter.js",
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
];

const forbiddenFiles = [
  "src/cli.ts",
  "fixtures/fully-typed/math.ts",
  "coverage/index.html",
];

const missing = requiredFiles.filter((file) => !packedFiles.has(file));
const leaked = forbiddenFiles.filter((file) => packedFiles.has(file));

if (missing.length > 0 || leaked.length > 0) {
  for (const file of missing) {
    console.error(`package smoke missing required file: ${file}`);
  }
  for (const file of leaked) {
    console.error(`package smoke leaked development file: ${file}`);
  }
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const binPath = packageJson.bin?.typegap?.replace(/^\.\//, "");
const binEntry = packument.files.find((file) => file.path === binPath);

if (!binPath || !binEntry) {
  console.error("package smoke missing typegap bin entry.");
  process.exit(1);
}

if ((binEntry.mode & 0o111) === 0) {
  console.error("package smoke found a non-executable typegap bin.");
  process.exit(1);
}

if (!readFileSync(binPath, "utf8").startsWith("#!/usr/bin/env node")) {
  console.error("package smoke found typegap bin without a Node shebang.");
  process.exit(1);
}

console.log(`typegap package smoke passed with ${packument.files.length} packed file(s).`);
