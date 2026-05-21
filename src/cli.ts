/**
 * typegap CLI — TypeScript type coverage auditor
 *
 * Usage: typegap [directory] [options]
 */

import { Command } from 'commander';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { analyzeDirectory } from './analyzer.js';
import { generateReport, saveBaseline, loadBaseline } from './reporter.js';
import { version } from '../package.json' with { type: 'json' };

const program = new Command();

program
  .name('typegap')
  .description('TypeScript type coverage auditor — find the holes without compiling')
  .version(version)
  .argument('[directory]', 'directory to scan', '.')
  .option('--ignore <patterns>', 'glob patterns to ignore (comma-separated)')
  .option('--format <type>', 'output format: text or json', 'text')
  .option('--detail', 'show per-file type annotation details')
  .option('--baseline <file>', 'save coverage baseline to JSON file')
  .option('--compare <file>', 'compare against a previously saved baseline')
  .option('--min-coverage <n>', 'minimum coverage percentage (exit 1 if below)', parseFloat)
  .option('--pattern <pattern>', 'glob pattern for target files', '**/*.{ts,tsx}')
  .action(async (directory: string, opts: Record<string, unknown>) => {
    const dir = resolve(directory);

    if (!existsSync(dir)) {
      console.error(`Error: directory "${dir}" does not exist`);
      process.exit(1);
    }

    const ignore = (opts.ignore as string | undefined)
      ? (opts.ignore as string).split(',').map((s: string) => s.trim())
      : [];

    const result = await analyzeDirectory(dir, {
      ignore,
      pattern: opts.pattern as string | undefined,
    });

    const { output, exitCode } = generateReport(result, {
      format: (opts.format as 'text' | 'json') ?? 'text',
      detail: (opts.detail as boolean) ?? false,
      saveBaseline: opts.baseline as string | undefined,
      compareBaseline: opts.compare as string | undefined,
      minCoverage: opts.minCoverage as number | undefined,
      cwd: process.cwd(),
    });

    console.log(output);

    if (opts.baseline) {
      saveBaseline(result, resolve(opts.baseline as string));
      console.log(`Baseline saved to ${opts.baseline}`);
    }

    process.exit(exitCode);
  });

program.parse();
