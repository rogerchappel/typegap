// Mixed codebase — some typed, some not

export function safe(x: number): number {
  return x + 1;
}

export function unsafe(data: any): any {
  return data;
}

export function semiTyped(name) {
  return 'hello';
}

export const arrow = (a: string): string => a.toUpperCase();

export function withUnknown(x: unknown): string {
  return String(x);
}

export function genericContainer<T>(items: Array<any>): T {
  return items[0] as T;
}
