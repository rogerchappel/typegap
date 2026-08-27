const DECIMAL_PERCENTAGE = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

export function parseMinCoverage(value: string): number {
  return DECIMAL_PERCENTAGE.test(value) ? Number(value) : Number.NaN;
}
