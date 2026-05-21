# Orchestration Plan — 5 Repos, Parallel Build

## Repos and Ownership

| Repo | Name | Description | Port/Worktree |
|------|------|-------------|---------------|
| `unuseddeps` | UnusedDeps | Detect unused Node.js dependencies by cross-referencing package.json vs imports | auto |
| `typegap` | TypeGap | Audit TypeScript projects for any usage, missing annotations, and type coverage | auto |
| `linkcheck` | LinkCheck | Scan markdown for broken internal links, missing anchors, and dead external URLs | auto |
| `autochangelog` | AutoChangelog | Generate changelogs from conventional git commits with semver suggestions | auto |
| `configdiff` | ConfigDiff | Compare config files across environments for drift, missing keys, and conflicts | auto |

## Build Waves (each sub-agent executes all waves for ONE repo)

### Wave 0: Confirm Scaffold
- Verify package.json, tsconfig, vitest, eslint, src structure
- npm install (or pnpm)

### Wave 1: Core Implementation
- Build the parser/scanner/analyzer engine
- Implement all format support
- Wire up internal logic

### Wave 2: CLI
- Implement commander CLI with all flags
- Add help text, examples

### Wave 3: Reporter
- Implement text, JSON, markdown output modes
- Colorized terminal output

### Wave 4: Tests & Fixtures
- Create fixture directories
- Write unit tests for core modules
- Write integration tests for CLI
- Ensure >85% coverage

### Wave 5: Docs & Polish
- Write README with personality and practical examples
- Write CONTRIBUTING.md
- Update package.json metadata (description, keywords, repository, homepage)
- Run npm test, npm run build, npm run check, npm run smoke

### Wave 6: Publish
- Commit all changes in ~30-40 meaningful atomic commits
- Push to `rogerchappel/<repo>` main branch
- Set branch protection
- GitHub repo must have useful description and topics

## Dependencies & Conflicts

- All repos are independent — no cross-dependencies
- Each sub-agent works in exactly ONE repo directory
- No worktree conflicts (each repo is freshly scaffolded)
- Port conflicts possible if tests start servers — use auto port assignment
- Each sub-agent must verify local tests pass before pushing

## Quality Checklist (all repos)
- [ ] Working local MVP (CLI runs, produces correct output)
- [ ] Fixture-backed tests (vitest)
- [ ] Clear README with personality and examples
- [ ] GitHub public repo with good description/topics
- [ ] Real commit history (30-50 meaningful commits)
- [ ] Branch protection configured
