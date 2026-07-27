# typegap

> TypeScript type coverage auditor — **find the holes without compiling**

[![npm version](https://img.shields.io/npm/v/typegap.svg)](https://www.npmjs.com/package/typegap)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

TypeScript is only as strong as its type annotations. `any` creeps in during rapid prototyping, functions lose explicit return types, and `noImplicitAny` stays disabled "just for now." Over time, this erodes the safety net.

**typegap** works statically — it parses ASTs from `.ts`/`.tsx` files and reports type holes **without needing `tsc` to succeed.**

## Quick Start

```bash
# Install
npm install -g typegap

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

## What It Catches

| Issue | Description |
|---|---|
| 🔴 **any** | Parameters or return types explicitly typed as `any` |
| 🟣 **unknown** | Parameters typed as `unknown` |
| ⚠️ **implicit** | Missing type annotations — implicit `any` or missing return types |

It also catches weak types hiding in generics like `Array<any>` and `Record<string, any>`.

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
| `--min-coverage <n>` | Exit non-zero if coverage drops below `n`% |
| `--pattern <pattern>` | Custom glob pattern for target files |

## CI Integration

```yaml
# .github/workflows/types-lint.yml
- name: Check type coverage
  run: npx typegap --min-coverage 80
```

## How It Works

1. Finds all `.ts` / `.tsx` files using glob
2. Parses each file with `@typescript-eslint/typescript-estree`
3. Walks the AST for functions, arrows, parameters, variables
4. Classifies each annotatable node: explicit, `any`, `unknown`, or implicit
5. Calculates coverage as `(total - implicit) / total * 100`

### What counts as "annotatable"

- Function / arrow return types
- Function / arrow parameters (including destructured and rest params)
- Variable declarations with explicit type annotations
- Catch clause parameters

Constructor methods are excluded (they cannot have return types). Inferred-only variables (e.g., `const x = 5`) are not flagged — only explicit annotation sites are audited.

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
- `npm run validate` - bash scripts/validate.sh
- `npm run package:smoke` - npm run build && node scripts/package-smoke.mjs
- `npm run release:check` - full and production audits, typecheck, lint, tests, smoke checks, and package smoke check

## Release readiness

Run the release gate before tagging or publishing:

```sh
npm run release:check
npm pack --dry-run
```

The package smoke check prints the tarball contents so missing runtime files are caught before release.
