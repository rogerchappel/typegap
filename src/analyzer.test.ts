import { describe, it, expect } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildFileResult, buildProjectResult, analyzeDirectory } from './analyzer.js';
import type { NodeInfo } from './types.js';
import { AnnotationStatus } from './types.js';

describe('buildFileResult', () => {
  it('calculates 100% coverage for all explicit annotations', () => {
    const nodes: NodeInfo[] = [
      { file: 'test.ts', line: 1, kind: 'return', name: 'fn return', status: AnnotationStatus.explicit },
      { file: 'test.ts', line: 1, kind: 'param', name: 'x', status: AnnotationStatus.explicit },
    ];
    const result = buildFileResult('test.ts', nodes);
    expect(result.coverage).toBe(100);
    expect(result.total).toBe(2);
    expect(result.implicitCount).toBe(0);
  });

  it('calculates 50% coverage for mixed explicit/implicit', () => {
    const nodes: NodeInfo[] = [
      { file: 'test.ts', line: 1, kind: 'return', name: 'fn return', status: AnnotationStatus.explicit },
      { file: 'test.ts', line: 1, kind: 'param', name: 'x', status: AnnotationStatus.implicit },
    ];
    const result = buildFileResult('test.ts', nodes);
    expect(result.coverage).toBe(50);
    expect(result.implicitCount).toBe(1);
  });

  it('counts any nodes separately', () => {
    const nodes: NodeInfo[] = [
      { file: 'test.ts', line: 1, kind: 'param', name: 'x', status: AnnotationStatus.any },
    ];
    const result = buildFileResult('test.ts', nodes);
    expect(result.anyCount).toBe(1);
    expect(result.coverage).toBe(100); // annotated, just weakly
  });

  it('counts unknown nodes separately', () => {
    const nodes: NodeInfo[] = [
      { file: 'test.ts', line: 1, kind: 'param', name: 'x', status: AnnotationStatus.unknown },
    ];
    const result = buildFileResult('test.ts', nodes);
    expect(result.unknownCount).toBe(1);
    expect(result.coverage).toBe(100);
  });

  it('returns 100% coverage for empty nodes list', () => {
    const result = buildFileResult('empty.ts', []);
    expect(result.coverage).toBe(100);
    expect(result.total).toBe(0);
  });

  it('tracks nodes array', () => {
    const nodes: NodeInfo[] = [
      { file: 'test.ts', line: 1, kind: 'param', name: 'x', status: AnnotationStatus.implicit },
    ];
    const result = buildFileResult('test.ts', nodes);
    expect(result.nodes).toEqual(nodes);
  });
});

describe('buildProjectResult', () => {
  it('aggregates multiple files', () => {
    const fileResults = [
      { file: 'a.ts', total: 2, annotated: 2, anyCount: 0, unknownCount: 0, implicitCount: 0, coverage: 100, nodes: [] },
      { file: 'b.ts', total: 2, annotated: 1, anyCount: 0, unknownCount: 0, implicitCount: 1, coverage: 50, nodes: [] },
    ];
    const result = buildProjectResult(fileResults);
    expect(result.total).toBe(4);
    expect(result.implicitCount).toBe(1);
    expect(result.coverage).toBe(75);
  });

  it('sums any and unknown counts', () => {
    const fileResults = [
      { file: 'a.ts', total: 1, annotated: 1, anyCount: 1, unknownCount: 0, implicitCount: 0, coverage: 100, nodes: [] },
      { file: 'b.ts', total: 1, annotated: 1, anyCount: 0, unknownCount: 1, implicitCount: 0, coverage: 100, nodes: [] },
    ];
    const result = buildProjectResult(fileResults);
    expect(result.anyCount).toBe(1);
    expect(result.unknownCount).toBe(1);
  });
});

describe('analyzeDirectory', () => {
  it('keeps default discovery exclusions', async () => {
    const fixtureDir = await mkdtemp(join(tmpdir(), 'typegap-discovery-'));

    try {
      await mkdir(join(fixtureDir, 'dist'));
      await writeFile(join(fixtureDir, 'included.ts'), 'export const value: string = "included";');
      await writeFile(join(fixtureDir, 'excluded.test.ts'), 'export const value = "test";');
      await writeFile(join(fixtureDir, 'excluded.d.ts'), 'export declare const value: string;');
      await writeFile(join(fixtureDir, 'dist', 'excluded.ts'), 'export const value = "dist";');

      const result = await analyzeDirectory(fixtureDir);

      expect(result.files.map((file) => file.file)).toEqual([join(fixtureDir, 'included.ts')]);
    } finally {
      await rm(fixtureDir, { recursive: true, force: true });
    }
  });

  it('limits discovery to a custom pattern', async () => {
    const result = await analyzeDirectory('fixtures', { pattern: '**/*.tsx' });

    expect(result.files.map((file) => file.file)).toEqual([
      expect.stringMatching(/fixtures\/tsx-project\/component\.tsx$/),
    ]);
  });

  it('analyzes fully-typed fixture with 100% coverage', async () => {
    const result = await analyzeDirectory('fixtures/fully-typed');
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.coverage).toBe(100);
  });

  it('analyzes any-usage fixture', async () => {
    const result = await analyzeDirectory('fixtures/any-usage');
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.anyCount).toBeGreaterThan(0);
    expect(result.files.find(file => file.file.endsWith('class-fields.ts'))).toMatchObject({
      total: 4,
      annotated: 4,
      anyCount: 2,
      unknownCount: 1,
      implicitCount: 0,
      coverage: 100,
    });
  });

  it('analyzes missing-types fixture with implicit issues', async () => {
    const result = await analyzeDirectory('fixtures/missing-types');
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.implicitCount).toBeGreaterThan(0);
  });

  it('ignores vendor directory when pattern is set', async () => {
    const result = await analyzeDirectory('fixtures', { ignore: ['**/vendor/**'] });
    const vendorFiles = result.files.filter(f => f.file.includes('vendor'));
    expect(vendorFiles).toHaveLength(0);
  });

  it('analyzes mixed fixture', async () => {
    const result = await analyzeDirectory('fixtures/mixed');
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.anyCount).toBeGreaterThan(0);
    expect(result.unknownCount).toBeGreaterThan(0);
    expect(result.implicitCount).toBeGreaterThan(0);
  });
});
