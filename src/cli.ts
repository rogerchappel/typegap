#!/usr/bin/env node
/**
 * typegap CLI — TypeScript type coverage auditor
 *
 * Usage: typegap [directory] [options]
 */

import { Command } from 'commander';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { analyzeDirectory } from './analyzer.js';
import { generateReport, saveBaseline } from './reporter.js';
import packageJson from '../package.json' with { type: 'json' };

const program = new Command();

program
  .name('typegap')
  .description('TypeScript type coverage auditor — find the holes without compiling')
  .version(packageJson.version)
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
    const format = opts.format as string;
    const minCoverage = opts.minCoverage as number | undefined;

    if (!existsSync(dir)) {
      console.error(`Error: directory "${dir}" does not exist`);
      process.exit(1);
    }

    if (format !== 'text' && format !== 'json') {
      console.error(`Error: unsupported format "${format}". Use "text" or "json".`);
      process.exit(1);
    }

    if (
      minCoverage !== undefined
      && (!Number.isFinite(minCoverage) || minCoverage < 0 || minCoverage > 100)
    ) {
      console.error('Error: --min-coverage must be a number between 0 and 100.');
      process.exit(1);
    }

    if (opts.compare && !existsSync(resolve(opts.compare as string))) {
      console.error(`Error: baseline file "${opts.compare}" does not exist`);
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
      format,
      detail: (opts.detail as boolean) ?? false,
      saveBaseline: opts.baseline as string | undefined,
      compareBaseline: opts.compare ? resolve(opts.compare as string) : undefined,
      minCoverage,
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
