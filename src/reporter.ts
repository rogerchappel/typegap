/**
 * Reporter — renders ProjectResult as text, JSON, or detail output.
 * Supports baseline save/compare, colored output.
 */

import { relative } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { ProjectResult, FileResult, Baseline, NodeInfo } from './types.js';
import { AnnotationStatus, IssueType } from './types.js';
import pc from 'picocolors';

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

export interface ReportOptions {
  /** Output format: text (default) | json */
  format?: 'text' | 'json';
  /** Enable detailed per-file node listing */
  detail?: boolean;
  /** Save baseline to file */
  saveBaseline?: string;
  /** Compare against baseline file */
  compareBaseline?: string;
  /** Minimum coverage threshold (exit non-zero if below) */
  minCoverage?: number;
  /** Base directory for relative paths */
  cwd?: string;
}

/** Generate report output string */
export function generateReport(result: ProjectResult, options: ReportOptions = {}): { output: string; exitCode: number } {
  const format = options.format ?? 'text';

  if (format === 'json') {
    return {
      output: formatJson(result, options),
      exitCode: checkMinCoverage(result, options.minCoverage),
    };
  }

  return {
    output: formatText(result, options),
    exitCode: checkMinCoverage(result, options.minCoverage),
  };
}

/* ------------------------------------------------------------------ */
/* Baseline                                                           */
/* ------------------------------------------------------------------ */

/** Save a baseline JSON file */
export function saveBaseline(result: ProjectResult, filePath: string): void {
  const baseline: Baseline = {
    version: 1,
    total: result.total,
    annotated: result.annotated,
    coverage: result.coverage,
    anyCount: result.anyCount,
    unknownCount: result.unknownCount,
    implicitCount: result.implicitCount,
    files: result.files.map(f => ({
      file: f.file,
      total: f.total,
      annotated: f.annotated,
      coverage: f.coverage,
    })),
    timestamp: new Date().toISOString(),
  };
  writeFileSync(filePath, JSON.stringify(baseline, null, 2) + '\n', 'utf-8');
}

/** Load a baseline JSON file */
export function loadBaseline(filePath: string): Baseline {
  if (!existsSync(filePath)) {
    throw new Error(`Baseline file not found: ${filePath}`);
  }
  return JSON.parse(readFileSync(filePath, 'utf-8')) as Baseline;
}

/** Compare current result against saved baseline */
export function compareWithBaseline(result: ProjectResult, baseline: Baseline): string {
  const lines: string[] = [];
  lines.push(pc.bold('\nBaseline Comparison'));
  lines.push(pc.dim(`  vs ${new Date(baseline.timestamp).toLocaleString()}`));
  lines.push('');

  const coverageDelta = result.coverage - baseline.coverage;
  const coverageColor = coverageDelta >= 0 ? pc.green : pc.red;
  const arrow = coverageDelta >= 0 ? '↑' : '↓';

  lines.push(`  Coverage:   ${coverageColor(`${arrow} ${Math.abs(coverageDelta).toFixed(1)}%`)}`);
  lines.push(`    Before:   ${baseline.coverage.toFixed(1)}%`);
  lines.push(`    Current:  ${result.coverage.toFixed(1)}%`);
  lines.push('');

  // per-file deltas
  const baselineMap = new Map(baseline.files.map(f => [f.file, f]));

  for (const f of result.files) {
    const prev = baselineMap.get(f.file);
    if (!prev) continue;

    const delta = f.coverage - prev.coverage;
    if (delta !== 0) {
      const color = delta > 0 ? pc.green : pc.red;
      const a = delta > 0 ? '↑' : '↓';
      lines.push(`  ${f.file}: ${color(`${a}${Math.abs(delta).toFixed(1)}%`)}`);
    }
  }

  // New files not in baseline
  for (const f of result.files) {
    if (!baselineMap.has(f.file)) {
      lines.push(`  ${f.file}: ${pc.yellow('new')} (${f.coverage.toFixed(1)}%)`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/* Text formatter                                                     */
/* ------------------------------------------------------------------ */

function formatText(result: ProjectResult, options: ReportOptions = {}): string {
  const lines: string[] = [];
  const cwd = options.cwd ?? process.cwd();
  const detail = options.detail ?? false;

  // Header
  lines.push(pc.bold('\nTypeGap — Type Coverage Report'));
  lines.push('');

  // Summary
  const coverageStr = formatCoverage(result.coverage);
  lines.push(`  Coverage:     ${coverageStr}`);
  lines.push(`  Files:        ${result.files.length}`);
  lines.push(`  Annotatable:  ${result.total}`);
  lines.push(`  Annotated:    ${pc.green(String(result.total - result.implicitCount))}`);
  lines.push(`  Implicit:     ${pc.red(String(result.implicitCount))}`);
  lines.push(`  Any:          ${pc.yellow(String(result.anyCount))}`);
  lines.push(`  Unknown:      pc.yellow(String(result.unknownCount))}`);
  // Fix the yellow call
  lines[lines.length - 1] = `  Unknown:      ${pc.yellow(String(result.unknownCount))}`;

  lines.push('');

  // Per-file summary
  if (result.files.length > 0) {
    lines.push(pc.bold('  Files'));
    lines.push(`  ${pc.dim('┌' + '─'.repeat(60) + '┐')}`);

    for (const f of result.files) {
      const relPath = relative(cwd, f.file);
      const cov = formatCoverage(f.coverage);
      const issues = [];
      if (f.anyCount > 0) issues.push(`${f.anyCount} any`);
      if (f.unknownCount > 0) issues.push(`${f.unknownCount} unknown`);
      if (f.implicitCount > 0) issues.push(`${f.implicitCount} implicit`);

      const issuesStr = issues.length > 0 ? pc.red(` (${issues.join(', ')})`) : pc.green(' ✓');
      lines.push(`  ${pc.dim('│')} ${cov.padEnd(8)} ${relPath + issuesStr}`);
      lines.push(`  ${pc.dim('└' + '─'.repeat(60) + '┘')}`);
    }

    lines.push('');
  }

  // Detail mode — list every problematic node
  if (detail) {
    lines.push(pc.bold('  Details'));
    lines.push('');

    const problematic = result.files
      .flatMap(f => f.nodes.filter(n => n.issue))
      .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

    if (problematic.length === 0) {
      lines.push('  No issues found! 🎉');
    } else {
      for (const node of problematic) {
        const relPath = relative(cwd, node.file);
        const issueLabel = formatIssueLabel(node);
        const name = node.name || '(unknown)';
        lines.push(`  ${pc.cyan(relPath)}:${node.line} ${issueLabel} → ${name}`);
      }
    }

    lines.push('');
  }

  // Baseline comparison
  if (options.compareBaseline && existsSync(options.compareBaseline)) {
    const baseline = loadBaseline(options.compareBaseline);
    lines.push(compareWithBaseline(result, baseline));
  }

  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/* JSON formatter                                                     */
/* ------------------------------------------------------------------ */

function formatJson(result: ProjectResult, _options: ReportOptions = {}): string {
  const output = {
    coverage: result.coverage,
    total: result.total,
    annotated: result.total - result.implicitCount,
    implicitCount: result.implicitCount,
    anyCount: result.anyCount,
    unknownCount: result.unknownCount,
    files: result.files.map(f => ({
      file: f.file,
      total: f.total,
      annotated: f.total - f.implicitCount,
      coverage: f.coverage,
      anyCount: f.anyCount,
      unknownCount: f.unknownCount,
      implicitCount: f.implicitCount,
    })),
  };
  return JSON.stringify(output, null, 2) + '\n';
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCoverage(pct: number): string {
  if (pct >= 90) return pc.green(`${pct.toFixed(1)}%`);
  if (pct >= 70) return pc.yellow(`${pct.toFixed(1)}%`);
  return pc.red(`${pct.toFixed(1)}%`);
}

function formatIssueLabel(node: NodeInfo): string {
  switch (node.issue) {
    case IssueType.any:
      return pc.red('any');
    case IssueType.unknown:
      return pc.magenta('unknown');
    case IssueType.implicit:
      return pc.yellow('implicit');
    default:
      return node.status ?? '';
  }
}

function checkMinCoverage(result: ProjectResult, minCoverage: number | undefined): number {
  if (minCoverage === undefined) return 0;
  return result.coverage >= minCoverage ? 0 : 1;
}
