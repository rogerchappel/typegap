#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

npm run check
npm run build
npm test
npm run smoke
npm run package:smoke

node dist/cli.js fixtures/fully-typed --format json --min-coverage 100 >/tmp/typegap-fully-typed.json
node -e "const fs=require('node:fs'); const r=JSON.parse(fs.readFileSync('/tmp/typegap-fully-typed.json','utf8')); if (r.coverage !== 100 || r.implicitCount !== 0) process.exit(1)"

printf 'TypeGap validation passed.\n'
