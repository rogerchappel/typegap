// Fully typed codebase — 100% coverage expected

export function add(a: number, b: number): number {
  return a + b;
}

export function greet(name: string): string {
  return `Hello, ${name}`;
}

export const multiply = (a: number, b: number): number => {
  return a * b;
};

export class Calculator {
  value: number;

  constructor(initial: number) {
    this.value = initial;
  }

  add(n: number): number {
    this.value += n;
    return this.value;
  }

  getValue(): number {
    return this.value;
  }
}
