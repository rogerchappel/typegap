#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

npm run build

output_dir="$(mktemp -d "${TMPDIR:-/tmp}/typegap-validation.XXXXXX")"
trap 'rm -rf "$output_dir"' EXIT

report_path="$output_dir/fully-typed.json"
invalid_report_path="$output_dir/invalid.json"

node dist/cli.js fixtures/fully-typed --format json --min-coverage 100 >"$report_path"
node scripts/assert-fully-typed.mjs "$report_path"

# Exercise the negative path so the gate cannot silently stop enforcing the
# fixture-specific coverage and implicit-type contract.
printf '%s\n' '{"coverage":99,"implicitCount":1}' >"$invalid_report_path"
if node scripts/assert-fully-typed.mjs "$invalid_report_path" >/dev/null 2>&1; then
  printf 'Invalid fully-typed report unexpectedly passed validation.\n' >&2
  exit 1
fi

printf 'TypeGap validation passed.\n'
