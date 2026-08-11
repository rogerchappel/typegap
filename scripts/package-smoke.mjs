import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repositoryRoot = resolve(".");
const readme = readFileSync("README.md", "utf8");
const documentedSourceInstall = "npm install --global .";

if (!readme.includes(documentedSourceInstall)) {
  console.error(`package smoke could not find documented install: ${documentedSourceInstall}`);
  process.exit(1);
}

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

const smokeDir = mkdtempSync(join(tmpdir(), "typegap-package-smoke-"));

try {
  const packResult = spawnSync("npm", ["pack", "--json", "--pack-destination", smokeDir], {
    encoding: "utf8",
  });

  if (packResult.status !== 0) {
    process.stderr.write(packResult.stderr);
    process.exit(packResult.status ?? 1);
  }

  const [packed] = JSON.parse(packResult.stdout);
  const tarballPath = join(smokeDir, packed.filename);
  const installResult = spawnSync("npm", ["install", "--ignore-scripts", tarballPath], {
    cwd: smokeDir,
    encoding: "utf8",
  });

  if (installResult.status !== 0) {
    process.stderr.write(installResult.stderr);
    process.exit(installResult.status ?? 1);
  }

  const cliResult = spawnSync(join(smokeDir, "node_modules", ".bin", "typegap"), ["--help"], {
    cwd: smokeDir,
    encoding: "utf8",
  });

  if (cliResult.status !== 0 || !cliResult.stdout.includes("Usage: typegap")) {
    process.stderr.write(cliResult.stderr);
    console.error("installed package smoke failed to run the typegap CLI.");
    process.exit(cliResult.status ?? 1);
  }

  const sourcePrefix = join(smokeDir, "source-prefix");
  const sourceInstallResult = spawnSync(
    "npm",
    ["install", "--global", "--ignore-scripts", "--prefix", sourcePrefix, repositoryRoot],
    { encoding: "utf8" },
  );

  if (sourceInstallResult.status !== 0) {
    process.stderr.write(sourceInstallResult.stderr);
    console.error("source-checkout smoke failed to install the documented local target.");
    process.exit(sourceInstallResult.status ?? 1);
  }

  const sourceCliResult = spawnSync(join(sourcePrefix, "bin", "typegap"), ["--help"], {
    cwd: smokeDir,
    encoding: "utf8",
  });

  if (sourceCliResult.status !== 0 || !sourceCliResult.stdout.includes("Usage: typegap")) {
    process.stderr.write(sourceCliResult.stderr);
    console.error("source-checkout smoke failed to run the globally installed CLI.");
    process.exit(sourceCliResult.status ?? 1);
  }

  const apiResult = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `import('${pathToFileURL(join(repositoryRoot, "dist", "index.js"))}').then((api) => { if (typeof api.analyzeDirectory !== 'function') process.exit(1); })`,
    ],
    { encoding: "utf8" },
  );

  if (apiResult.status !== 0) {
    process.stderr.write(apiResult.stderr);
    console.error("source-checkout smoke failed to import the documented public API.");
    process.exit(apiResult.status ?? 1);
  }

  console.log(
    `typegap package smoke passed with ${packument.files.length} packed file(s), packaged and source-installed CLI invocations, and a public API import.`,
  );
} finally {
  rmSync(smokeDir, { recursive: true, force: true });
}
