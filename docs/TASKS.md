# TypeGap - Implementation Tasks

## Phase 0: PRD (done)
- [x] Write PRD.md

## Phase 1: Package Setup (done)
- [x] Set up package.json: name=typegap, type=module
- [x] Configure tsconfig.json for ESM
- [x] Add dependencies: tsx, glob, @typescript-eslint/typescript-estree, commander, picocolors
- [x] Set up eslint config
- [x] Create src/cli.ts, src/parser.ts, src/analyzer.ts, src/reporter.ts
- [x] Set up vitest config

## Phase 2: AST Parser (done)
- [x] Use @typescript-eslint/typescript-estree to parse .ts/.tsx files
- [x] Walk AST to find: function declarations, arrow functions, variable declarations, parameters
- [x] For each: detect if type annotation is present, and what type (explicit, any, unknown, implicit)
- [x] Track counts: total annotatable nodes, annotated nodes, any usages, unknown usages

## Phase 3: Analyzer (done)
- [x] Calculate type coverage percentage
- [x] Flag `any` locations with file:line references
- [x] Flag implicit-any locations
- [x] Support --ignore patterns for generated/vendor paths
- [x] Handle nested types: `Record<string, any>`, `Array<any>`, etc.
- [x] Support per-file analysis

## Phase 4: Reporter (done)
- [x] Text summary: overall coverage, breakdown by type category
- [x] JSON output mode (--format json)
- [x] Per-file detail mode (--detail)
- [x] Colorized output
- [x] Track baseline: --baseline file.json, --compare file.json
- [x] --min-coverage threshold (exit non-zero if below)

## Phase 5: CLI (done)
- [x] Main command: scan directory (default .)
- [x] Flags: --ignore, --format, --detail, --baseline, --compare, --min-coverage
- [x] Help text and examples

## Phase 6: Tests & Fixtures (done)
- [x] Create fixtures/ with:
  - fully-typed project
  - project with any usage
  - project with missing return types
  - project with implicit any
- [x] Unit tests for parser
- [x] Unit tests for analyzer
- [x] Integration test for CLI
- [x] Run vitest

## Phase 7: Docs & Polish (in progress)
- [x] Write README with personality
- [x] Write CONTRIBUTING.md
- [ ] Add to GitHub: description, topics
- [x] npm test, npm run build, npm run check
