/**
 * Analyzer — aggregates NodeInfo into FileResult / ProjectResult,
 * applies ignore patterns, calculates coverage.
 */

import type { NodeInfo, FileResult, ProjectResult } from './types.js';
import { parseFile } from './parser.js';
import { glob } from 'glob';

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

/** Analyze one or more files and return a ProjectResult */
export async function analyzeDirectory(
  dir: string,
  options: AnalyzeOptions = {},
): Promise<ProjectResult> {
  const files = await findFiles(dir, options);
  const fileResults: FileResult[] = [];

  for (const file of files) {
    const nodes = parseFile(file);
    const result = buildFileResult(file, nodes);
    fileResults.push(result);
  }

  return buildProjectResult(fileResults);
}

/** Analyze a pre-collected list of files */
export async function analyzeFiles(
  filePaths: string[],
  options: AnalyzeOptions = {},
): Promise<ProjectResult> {
  void options;
  const fileResults: FileResult[] = [];

  for (const file of filePaths) {
    const nodes = parseFile(file);
    const result = buildFileResult(file, nodes);
    fileResults.push(result);
  }

  return buildProjectResult(fileResults);
}



export interface AnalyzeOptions {
  /** Glob patterns to ignore */
  ignore?: string[];
  /** Glob pattern for target files (default **\/*.{ts,tsx}) */
  pattern?: string;
}

/* ------------------------------------------------------------------ */
/* File discovery                                                     */
/* ------------------------------------------------------------------ */

async function findFiles(dir: string, options: AnalyzeOptions): Promise<string[]> {
  const pattern = options.pattern ?? '**/*.{ts,tsx}';
  const ignore = options.ignore ?? [];

  // Add defaults
  const defaultIgnore = ['**/node_modules/**', '**/dist/**', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'];
  const allIgnore = [...defaultIgnore, ...ignore];

  const files = await glob(pattern, {
    cwd: dir,
    ignore: allIgnore,
    nodir: true,
    absolute: true,
  });

  return files.sort();
}

/* ------------------------------------------------------------------ */
/* Aggregation                                                        */
/* ------------------------------------------------------------------ */

/** Build a FileResult from nodes */
export function buildFileResult(file: string, nodes: NodeInfo[]): FileResult {
  const total = nodes.length;
  const annotated = nodes.filter((n) => n.status !== 'implicit').length;
  const anyCount = nodes.filter((n) => n.status === 'any').length;
  const unknownCount = nodes.filter((n) => n.status === 'unknown').length;
  const implicitCount = nodes.filter((n) => n.status === 'implicit').length;

  // coverage = (total - implicit) / total * 100
  // any/unknown HAVE types (just weak ones), so they count toward coverage
  return {
    file,
    total,
    annotated,
    anyCount,
    unknownCount,
    implicitCount,
    coverage: total > 0 ? round((total - implicitCount) / total * 100) : 100,
    nodes,
  };
}

/** Build a ProjectResult from file results */
export function buildProjectResult(fileResults: FileResult[]): ProjectResult {
  const total = fileResults.reduce((s, f) => s + f.total, 0);
  const annotated = fileResults.reduce((s, f) => s + f.annotated, 0);
  const anyCount = fileResults.reduce((s, f) => s + f.anyCount, 0);
  const unknownCount = fileResults.reduce((s, f) => s + f.unknownCount, 0);
  const implicitCount = fileResults.reduce((s, f) => s + f.implicitCount, 0);

  return {
    files: fileResults,
    total,
    annotated,
    anyCount,
    unknownCount,
    implicitCount,
    coverage: total > 0 ? round((total - implicitCount) / total * 100) : 100,
  };
}

/** Round to 1 decimal */
function round(n: number): number {
  return Math.round(n * 10) / 10;
}
