import { describe, it, expect } from 'vitest';
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

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
    expect(json.files.find((file: { file: string }) => file.file.endsWith('class-fields.ts'))).toMatchObject({
      total: 4,
      annotated: 4,
      anyCount: 2,
      unknownCount: 1,
      coverage: 100,
    });
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

  it.each(['80junk', '.5oops', '0x10'])('rejects malformed minimum coverage %s', (value) => {
    const result = spawnSync('npx', ['tsx', 'src/cli.ts', 'fixtures/fully-typed', '--min-coverage', value], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain(
      'Error: --min-coverage must be a number between 0 and 100.',
    );
  });

  it.each(['0', '.5', '80.25', '100'])('accepts decimal minimum coverage %s', (value) => {
    const result = spawnSync('npx', ['tsx', 'src/cli.ts', 'fixtures/fully-typed', '--min-coverage', value], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
  });

  it('errors on missing compare baseline', () => {
    expect(() => {
      execSync(`${cli} fixtures/fully-typed --compare fixtures/no-baseline.json`, { encoding: 'utf-8' });
    }).toThrow();
  });

  it.each(['text', 'json'])('reports invalid baselines without a stack trace in %s mode', (format) => {
    const baseline = 'fixtures/invalid-baseline-test.json';
    writeFileSync(baseline, '{not json\n');
    try {
      const result = spawnSync('npx', ['tsx', 'src/cli.ts', 'fixtures/fully-typed', '--compare', baseline, '--format', format], {
        encoding: 'utf8',
      });
      expect(result.status).toBe(1);
      const output = `${result.stdout}${result.stderr}`;
      expect(output).toContain('Invalid baseline: malformed JSON');
      expect(output).not.toContain('SyntaxError');
      expect(output).not.toContain('at loadBaseline');
      if (format === 'json') {
        expect(JSON.parse(result.stdout)).toEqual({ error: 'Invalid baseline: malformed JSON' });
      }
    } finally {
      rmSync(baseline, { force: true });
    }
  });
});
