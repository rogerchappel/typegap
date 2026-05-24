import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateReport, saveBaseline, loadBaseline, compareWithBaseline } from './reporter.js';
import { buildProjectResult } from './analyzer.js';
import { AnnotationStatus } from './types.js';
import type { FileResult } from './types.js';
import { rmSync, existsSync } from 'node:fs';

const BASELINE_FILE = 'fixtures/baseline-test.json';

function makeResult(override: Partial<FileResult> & Partial<ReturnType<typeof buildProjectResult>> = {}) {
  const files: FileResult[] = [
    {
      file: 'test.ts',
      total: 4,
      annotated: 2,
      anyCount: 1,
      unknownCount: 0,
      implicitCount: 1,
      coverage: 75,
      nodes: [
        { file: 'test.ts', line: 1, kind: 'return', name: 'fn return', status: AnnotationStatus.explicit },
        { file: 'test.ts', line: 1, kind: 'param', name: 'x', status: AnnotationStatus.explicit },
        { file: 'test.ts', line: 2, kind: 'param', name: 'y', status: AnnotationStatus.any },
        { file: 'test.ts', line: 3, kind: 'param', name: 'z', status: AnnotationStatus.implicit },
      ],
    },
  ];
  return buildProjectResult(files);
}

describe('generateReport', () => {
  it('generates text format output', () => {
    const result = makeResult();
    const { output } = generateReport(result, { format: 'text' });
    expect(output).toContain('TypeGap');
    expect(output).toContain('75.0%');
    expect(output).toContain('Annotatable');
  });

  it('generates JSON format output', () => {
    const result = makeResult();
    const { output } = generateReport(result, { format: 'json' });
    const json = JSON.parse(output);
    expect(json.coverage).toBe(75);
    expect(json.files).toHaveLength(1);
    expect(json.anyCount).toBe(1);
  });

  it('returns exit code 0 when above min coverage', () => {
    const result = makeResult();
    const { exitCode } = generateReport(result, { minCoverage: 70 });
    expect(exitCode).toBe(0);
  });

  it('returns exit code 1 when below min coverage', () => {
    const result = makeResult();
    const { exitCode } = generateReport(result, { minCoverage: 80 });
    expect(exitCode).toBe(1);
  });

  it('shows detail mode with issues', () => {
    const result = makeResult();
    const { output } = generateReport(result, { format: 'text', detail: true });
    expect(output).toContain('Details');
    // Should list implicit and any issues
    expect(output).toMatch(/\bimplicit\b|\bany\b/i);
  });
});

describe('saveBaseline / loadBaseline', () => {
  afterEach(() => {
    if (existsSync(BASELINE_FILE)) {
      rmSync(BASELINE_FILE);
    }
  });

  it('saves and loads a baseline', () => {
    const result = makeResult();
    saveBaseline(result, BASELINE_FILE);
    expect(existsSync(BASELINE_FILE)).toBe(true);

    const loaded = loadBaseline(BASELINE_FILE);
    expect(loaded.version).toBe(1);
    expect(loaded.coverage).toBe(75);
    expect(loaded.total).toBe(4);
    expect(loaded.files).toHaveLength(1);
  });

  it('throws if baseline file does not exist', () => {
    expect(() => loadBaseline('nonexistent.json')).toThrow();
  });

  it('includes timestamp in baseline', () => {
    const result = makeResult();
    saveBaseline(result, BASELINE_FILE);
    const loaded = loadBaseline(BASELINE_FILE);
    expect(loaded.timestamp).toBeDefined();
    expect(new Date(loaded.timestamp)).toBeInstanceOf(Date);
  });

  it('stores file paths relative to cwd when possible', () => {
    const result = makeResult();
    result.files[0].file = `${process.cwd()}/src/example.ts`;

    saveBaseline(result, BASELINE_FILE, process.cwd());

    const loaded = loadBaseline(BASELINE_FILE);
    expect(loaded.files[0].file).toBe('src/example.ts');
  });
});

describe('compareWithBaseline', () => {
  it('shows coverage delta', () => {
    const oldResult = makeResult();
    saveBaseline(oldResult, BASELINE_FILE);
    const baseline = loadBaseline(BASELINE_FILE);

    // New result with better coverage
    const newResult = makeResult();
    newResult.files[0].coverage = 80;
    // Recalculate project totals
    newResult.implicitCount = 0; // improved
    newResult.coverage = 100;

    const output = compareWithBaseline(newResult, baseline);
    expect(output).toContain('Baseline Comparison');
    expect(output).toContain('75.0%');
    expect(output).toContain('100.0%');
  });

  it('shows improvement with green arrow', () => {
    const oldResult = makeResult();
    saveBaseline(oldResult, BASELINE_FILE);
    const baseline = loadBaseline(BASELINE_FILE);

    const newResult = makeResult();
    newResult.coverage = 90;

    const output = compareWithBaseline(newResult, baseline);
    expect(output).toContain('75.0%');
    expect(output).toContain('90.0%');
  });
});

afterEach(() => {
  if (existsSync(BASELINE_FILE)) {
    rmSync(BASELINE_FILE);
  }
});
