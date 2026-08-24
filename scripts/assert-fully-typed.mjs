import { readFile } from 'node:fs/promises';

const [reportPath] = process.argv.slice(2);

if (!reportPath) {
  console.error('Usage: node scripts/assert-fully-typed.mjs <report.json>');
  process.exit(2);
}

const report = JSON.parse(await readFile(reportPath, 'utf8'));

if (report.coverage !== 100 || report.implicitCount !== 0) {
  console.error(
    `Expected 100% coverage and zero implicit types; received ${String(report.coverage)}% coverage and ${String(report.implicitCount)} implicit types.`,
  );
  process.exit(1);
}
