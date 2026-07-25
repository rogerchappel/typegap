import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

describe('CLI integration', () => {
  const cli = 'npx tsx src/cli.ts';

  it('shows help text', () => {
    const output = execSync(`${cli} --help`, { encoding: 'utf-8' });
    expect(output).toContain('typegap');
    expect(output).toContain('TypeScript type coverage auditor');
  });

  it('reports the package version', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
    const output = execSync(`${cli} --version`, { encoding: 'utf-8' });
    expect(output.trim()).toBe(packageJson.version);
  });

  it('scans the fixtures directory', () => {
    const output = execSync(`${cli} fixtures/fully-typed`, { encoding: 'utf-8' });
    expect(output).toContain('100.0%');
  });

  it('outputs JSON format', () => {
    const output = execSync(`${cli} fixtures/any-usage --format json`, { encoding: 'utf-8' });
    const json = JSON.parse(output);
    expect(json.coverage).toBe(100); // any counts as annotated (has a type)
    expect(json.anyCount).toBeGreaterThan(0);
  });

  it('shows detail mode', () => {
    const output = execSync(`${cli} fixtures/mixed --detail`, { encoding: 'utf-8' });
    expect(output).toContain('Details');
  });

  it('exits non-zero when below min coverage', () => {
    expect(() => {
      execSync(`${cli} fixtures/missing-types --min-coverage 100`, { encoding: 'utf-8' });
    }).toThrow();
  });

  it('ignores files with --ignore pattern', () => {
    const output = execSync(`${cli} fixtures --ignore '**/vendor/**' --detail`, { encoding: 'utf-8' });
    expect(output).not.toContain('vendor');
  });

  it('scans current directory when no argument', () => {
    const output = execSync(cli, { encoding: 'utf-8', cwd: process.cwd() });
    expect(output).toContain('Coverage');
  });

  it('errors on nonexistent directory', () => {
    expect(() => {
      execSync(`${cli} /nonexistent/path`, { encoding: 'utf-8' });
    }).toThrow();
  });

  it('errors on unsupported output format', () => {
    expect(() => {
      execSync(`${cli} fixtures/fully-typed --format yaml`, { encoding: 'utf-8' });
    }).toThrow();
  });

  it('errors on invalid minimum coverage', () => {
    expect(() => {
      execSync(`${cli} fixtures/fully-typed --min-coverage 101`, { encoding: 'utf-8' });
    }).toThrow();
  });

  it('errors on missing compare baseline', () => {
    expect(() => {
      execSync(`${cli} fixtures/fully-typed --compare fixtures/no-baseline.json`, { encoding: 'utf-8' });
    }).toThrow();
  });
});
