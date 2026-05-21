# Contributing to typegap

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/rogerchappel/typegap.git
cd typegap
npm install
```

## Scripts

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript |
| `npm run dev` | Run CLI from source |
| `npm run check` | Type-check without building |
| `npm run lint` | Run ESLint |
| `npm run format` | Format source with Prettier |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |

## Architecture

```
src/
├── cli.ts       # CLI entry point (commander)
├── parser.ts    # AST parsing and annotation detection
├── analyzer.ts  # File discovery, aggregation, coverage math
├── reporter.ts  # Output formatting (text/JSON/baseline)
├── types.ts     # Shared type definitions
└── *.test.ts    # Unit / integration tests
```

## Adding New Checks

1. Modify `src/parser.ts` to visit the new AST node type in the `visit()` switch
2. Add a handler like `handleXxx()` that produces `NodeInfo[]`
3. Run tests and add coverage

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

Test fixtures are in `fixtures/`. Add fixture directories for new test scenarios.

## Pull Requests

- Keep PRs focused — one feature or fix at a time
- Ensure `npm test` passes and coverage thresholds are met
- Update docs if changing CLI behavior

## Code of Conduct

Please be respectful and constructive. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
