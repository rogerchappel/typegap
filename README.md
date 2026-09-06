# typegap

> TypeScript type coverage auditor — **find the holes without compiling**

[![Distribution: source checkout](https://img.shields.io/badge/distribution-source%20checkout-blue.svg)](#installation-status)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

TypeScript is only as strong as its type annotations. `any` creeps in during rapid prototyping, functions lose explicit return types, and `noImplicitAny` stays disabled "just for now." Over time, this erodes the safety net.

**typegap** works statically — it parses ASTs from `.ts`/`.tsx` files and reports type holes **without needing `tsc` to succeed.**

## Quick Start

The package is not published to npm yet. Install the current version from a
source checkout:

```bash
git clone https://github.com/rogerchappel/typegap.git
cd typegap
npm ci
npm run build
npm install --global .

# Scan current directory
typegap

# Scan a specific directory with detail
typegap ./src --detail

# Output as JSON
typegap --format json

# Set a minimum coverage threshold (exits 1 if below)
typegap --min-coverage 90

# Save and compare baselines
typegap --baseline coverage.json
# ... later ...
typegap --compare coverage.json
```

Baseline comparisons report changed and new files, plus files that were present
in the saved baseline but are absent from the current scan. Removed files retain
their previous coverage in both text and JSON output, so deleting a low-coverage
file cannot appear as an unexplained overall improvement.

The global install points at the checkout, so rebuild after pulling changes.
When the first npm release is available, `npm install --global typegap` will
become the registry installation path; it is not supported today.

### Programmatic usage

Until registry publication, import the built entry point from the checkout:

```js
import { analyzeDirectory } from "./typegap/dist/index.js";

const result = await analyzeDirectory("./src");
console.log(result.coverage);
```

## What It Catches

| Issue | Description |
|---|---|
| 🔴 **any** | Annotations containing `any`, including nested weak types |
| 🟣 **unknown** | Annotations containing `unknown`, including nested weak types |
| ⚠️ **implicit** | Missing type annotations — implicit `any` or missing return types |

It also catches weak types nested in generics (`Array<any>`, `Record<string,
any>`). Class fields with explicit annotations report one property finding,
including public, private, protected, static, readonly, declare, and optional
fields. Interface declarations and direct object type aliases report their
properties, method parameters and returns, and index signatures individually.
Function type parameters and returns nested in another annotation contribute to
that enclosing finding. When one annotation contains both, `any` takes
precedence over `unknown`.

## Output

### Text Summary (default)

```
TypeGap — Type Coverage Report

  Coverage:     64.3%
  Files:        12
  Annotatable:  140
  Annotated:    90
  Implicit:     50
  Any:          8
  Unknown:      2

  Files
  ┌────────────────────────────────────────────────────────────┐
  │ 100.0% ✓   src/utils/helpers.ts
  │ 75.0%   src/core/parser.ts (1 any, 2 implicit)
  │ 50.0%   src/api/handler.ts (5 any, 3 implicit)
  └────────────────────────────────────────────────────────────┘
```

### Detail Mode (`--detail`)

```
  Details

  src/api/handler.ts:42 any → process(data)
  src/api/handler.ts:58 implicit → transform(params)
  src/core/utils.ts:15 implicit → format(value)
```

## Flags

| Flag | Description |
|---|---|
| `[directory]` | Directory to scan (default: `.`) |
| `--ignore <patterns>` | Glob patterns to ignore (comma-separated) |
| `--format <type>` | Output format: `text` or `json` (default: `text`) |
| `--detail` | Show per-file type annotation details |
| `--baseline <file>` | Save coverage baseline to a JSON file |
| `--compare <file>` | Compare against a saved baseline |
| `--min-coverage <n>` | Exit non-zero if coverage drops below decimal `n`% (0–100) |
| `--pattern <pattern>` | Custom glob pattern for target files |

Baselines are versioned JSON documents. TypeGap currently accepts version `1`, including the
numeric project totals and an array of file entries with a non-empty `file` path plus numeric
`total`, `annotated`, and `coverage` fields. Malformed JSON, unsupported versions, and invalid
fields are rejected with a concise error; `--format json` returns that error as JSON.
The same failure-output contract applies when source analysis or baseline saving fails: text mode
writes one concise error to stderr, while JSON mode writes one parseable `{ "error": "..." }`
object to stdout. A baseline save failure is reported before any coverage report or success message.

## CI Integration

CI should also run from a source checkout until the package is published:

```yaml
# .github/workflows/types-lint.yml
- uses: actions/checkout@v6
- uses: actions/setup-node@v4
  with:
    node-version: 22
- run: npm ci
- run: npm run build
- name: Check type coverage
  run: node dist/cli.js --min-coverage 80
```

## How It Works

1. Finds all `.ts` / `.tsx` files using glob
2. Parses each file with `@typescript-eslint/typescript-estree`
3. Walks the AST for functions, arrows, parameters, variables, and class fields
4. Classifies each annotatable node: explicit, `any`, `unknown`, or implicit
5. Calculates coverage as `(total - implicit) / total * 100`

### What counts as "annotatable"

- Function / arrow return types
- Function / arrow parameters (including destructured and rest params)
- Variable declarations with explicit type annotations
- Class fields with explicit type annotations (including private and modified fields)
- Catch clause parameters

Constructor methods are excluded (they cannot have return types). Inferred-only
variables and class fields (for example, `const x = 5` or `value = 5`) are not
flagged — only explicit annotation sites are audited.

Nested `any` and `unknown` are propagated through supported TypeScript type
annotations, including type predicates and mapped-type key constraints,
remapped keys, and values. When both occur in one annotation, `any` takes
precedence.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and development guidelines.

### Quick dev setup

```bash
git clone https://github.com/rogerchappel/typegap.git
cd typegap
npm install
npm run build
npm test
```

## Limitations and Safety

- TypeScript type coverage auditor — find the holes without compiling; it is intended for local, reviewable developer workflows rather than unattended production automation.
- Review generated output before using it in commits, releases, issue updates, or connector actions.
- Avoid passing secrets, private customer data, or unredacted logs through fixtures, examples, or command output.
- Treat warnings and non-zero exits from `typegap` as review signals, then rerun the documented verification command after changes.

## License

MIT © [Roger Chappel](https://github.com/rogerchappel)

## Development

Typegap supports Node.js 20.19+ and 22 or newer. Node.js 21
is not supported because the shipped runtime dependency set does not support
those releases.

Run the same release gate used by CI before opening a PR:

```bash
npm run release:check
```

The release gate covers:

- `npm run audit:all` - audit the complete dependency graph, including development tooling
- `npm run audit:prod` - audit shipped dependencies for known vulnerabilities
- `npm run check` - tsc --noEmit
- `npm run lint` - eslint src --ext .ts
- `npm run build` - tsc && chmod +x dist/cli.js
- `npm test` - vitest run --coverage
- `npm run smoke` - npm run build && node dist/cli.js --help && node dist/cli.js fixtures --format text
- `npm run validate` - build the CLI, assert the fully typed fixture reports 100% coverage and zero implicit types, and verify invalid output is rejected
- `npm run package:smoke` - npm run build && node scripts/package-smoke.mjs

## Release readiness

### Installation status

Typegap is currently available from its source checkout, not the npm registry.
The commands in Quick Start are the supported installation workflow while the
project prepares its first release.

Run the release gate before tagging or publishing:

```sh
npm run release:check
npm pack --dry-run
```

The package smoke check prints the tarball contents, installs the current
checkout into an isolated npm prefix, invokes the installed CLI, and imports
the public API. This catches missing runtime files and stale installation
instructions before release.
