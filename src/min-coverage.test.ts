import { describe, expect, it } from 'vitest';
import { parseMinCoverage } from './min-coverage.js';

describe('parseMinCoverage', () => {
  it.each([
    ['0', 0],
    ['.5', 0.5],
    ['80.25', 80.25],
    ['100', 100],
  ])('parses decimal percentage %s', (input, expected) => {
    expect(parseMinCoverage(input)).toBe(expected);
  });

  it.each(['80junk', '.5oops', '0x10', '1e2', '', ' 80'])('rejects non-decimal input %j', (input) => {
    expect(parseMinCoverage(input)).toBeNaN();
  });
});
