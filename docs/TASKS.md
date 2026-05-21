# TypeGap - Implementation Tasks

## Phase 0: PRD (done)
- [x] Write PRD.md

## Phase 1: Package Setup
- [ ] Set up package.json: name=typegap, type=module
- [ ] Configure tsconfig.json for ESM
- [ ] Add dependencies: tsx, glob, @typescript-eslint/typescript-estree, commander, picocolors
- [ ] Set up eslint config
- [ ] Create src/cli.ts, src/parser.ts, src/analyzer.ts, src/reporter.ts
- [ ] Set up vitest config

## Phase 2: AST Parser
- [ ] Use @typescript-eslint/typescript-estree to parse .ts/.tsx files
- [ ] Walk AST to find: function declarations, arrow functions, variable declarations, parameters
- [ ] For each: detect if type annotation is present, and what type (explicit, any, unknown, implicit)
- [ ] Track counts: total annotatable nodes, annotated nodes, any usages, unknown usages

## Phase 3: Analyzer
- [ ] Calculate type coverage percentage
- [ ] Flag `any` locations with file:line references
- [ ] Flag implicit-any locations
- [ ] Support --ignore patterns for generated/vendor paths
- [ ] Handle nested types: `Record<string, any>`, `Array<any>`, etc.
- [ ] Support per-file analysis

## Phase 4: Reporter
- [ ] Text summary: overall coverage, breakdown by type category
- [ ] JSON output mode (--format json)
- [ ] Per-file detail mode (--detail)
- [ ] Colorized output
- [ ] Track baseline: --baseline file.json, --compare file.json
- [ ] --min-coverage threshold (exit non-zero if below)

## Phase 5: CLI
- [ ] Main command: scan directory (default .)
- [ ] Flags: --ignore, --format, --detail, --baseline, --compare, --min-coverage
- [ ] Help text and examples

## Phase 6: Tests & Fixtures
- [ ] Create fixtures/ with:
  - fully-typed project
  - project with any usage
  - project with missing return types
  - project with implicit any
- [ ] Unit tests for parser
- [ ] Unit tests for analyzer
- [ ] Integration test for CLI
- [ ] Run vitest

## Phase 7: Docs & Polish
- [ ] Write README with personality
- [ ] Write CONTRIBUTING.md
- [ ] Add to GitHub: description, topics
- [ ] npm test, npm run build, npm run check
