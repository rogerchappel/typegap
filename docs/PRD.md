# TypeGap PRD

Status: MVP implemented; npm publication remains pending

## Summary

TypeGap is a local-first TypeScript CLI that audits TypeScript projects for `any` usage, missing return types, and implicit type annotations — producing actionable reports on type coverage without requiring a full project compile.

## Motivation

TypeScript is only as strong as its type annotations. Codebases drift: `any` creeps in during rapid development, functions lose explicit return types, and `noImplicitAny` gets disabled to unblock prototyping. Over time this erodes the safety net.

Tools like `ts-coverage-report` exist but require compiling the full project and produce verbose output. TypeGap works statically — it parses ASTs from `.ts`/`.tsx` files and reports type holes without needing `tsc` to succeed.

## Target users

- Tech leads tracking type-hygiene metrics over time
- Teams adopting TypeScript incrementally
- OSS maintainers wanting to communicate type confidence
- Agentic workflows that need to gauge how safe it is to refactor code

## Goals

- Parse TypeScript/TSX files using a lightweight AST parser
- Count total functions, parameters, variables, and type annotations
- Calculate type coverage as a percentage
- Flag `any`, `unknown`, and implicit-any locations with file:line references
- Support `--ignore` patterns for generated/vendor paths
- Output text summary (default), JSON, and per-file detail modes
- Track baseline and compare (`--baseline` and `--compare`)
- Exit non-zero when coverage drops below threshold (`--min-coverage`)

## Non-goals

- Type checking (that's tsc's job)
- Auto-fixing type annotations
- JavaScript project analysis (TS/TSX only in MVP)

## Source attribution

Inspired by general discussions about TypeScript type coverage and tools like ts-coverage-report. This is a reframed local-first take focused on fast static analysis without compilation requirements.
