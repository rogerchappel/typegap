import { describe, it, expect } from 'vitest';
import { parseSource, parseFile, extractTypeName } from './parser.js';
import { AnnotationStatus, IssueType } from './types.js';
import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { parse } from '@typescript-eslint/typescript-estree';

describe('parseTSX', () => {
  it('parses TSX files with JSX elements', () => {
    const nodes = parseFile('fixtures/tsx-project/component.tsx');
    expect(nodes.length).toBeGreaterThan(0);
  });

  it('detects implicit types in catch clause', () => {
    const nodes = parseSource(`function catchWithoutType() {\n  try { return 1; } catch (e) { return 0; }\n}`);
    const paramNodes = nodes.filter(n => n.name === 'e');
    expect(paramNodes.length).toBeGreaterThan(0);
    expect(paramNodes[0].status).toBe(AnnotationStatus.implicit);
  });

  it('detects implicit types in destructured params with type', () => {
    const nodes = parseSource(`function fn({ name }: { name: string }) { return name; }`);
    const paramNodes = nodes.filter(n => n.kind === 'param');
    expect(paramNodes.length).toBeGreaterThan(0);
    expect(paramNodes[0].status).toBe(AnnotationStatus.explicit);
  });

  it('detects rest parameters with types', () => {
    const nodes = parseSource(`function fn(...args: string[]): void {}`);
    const paramNodes = nodes.filter(n => n.name.startsWith('...'));
    expect(paramNodes.length).toBeGreaterThan(0);
    expect(paramNodes[0].status).toBe(AnnotationStatus.explicit);
  });

  it('detects rest parameters without types', () => {
    const nodes = parseSource(`function fn(...args) { return args; }`);
    const paramNodes = nodes.filter(n => n.name.startsWith('...'));
    expect(paramNodes.length).toBeGreaterThan(0);
    expect(paramNodes[0].status).toBe(AnnotationStatus.implicit);
  });

  it('detects any in function return with generic', () => {
    const nodes = parseSource(`function wrap<T>(x: T): any { return x as any; }`);
    const retNodes = nodes.filter(n => n.kind === 'return');
    expect(retNodes.length).toBeGreaterThan(0);
    expect(retNodes[0].status).toBe(AnnotationStatus.any);
  });

  it('detects implicit from destructured param without annotation', () => {
    const nodes = parseSource(`function fn({ name, age }) { return name + age; }`);
    const paramNodes = nodes.filter(n => n.kind === 'param');
    expect(paramNodes.length).toBeGreaterThan(0);
    expect(paramNodes[0].status).toBe(AnnotationStatus.implicit);
    expect(paramNodes[0].name).toBe('{...}');
  });

  it('handles variable declaration with explicit type', () => {
    const nodes = parseSource(`const x: number = 5;`);
    const varNodes = nodes.filter(n => n.kind === 'var');
    expect(varNodes.length).toBe(1);
    expect(varNodes[0].status).toBe(AnnotationStatus.explicit);
  });

  it('handles variable declaration with any type', () => {
    const nodes = parseSource(`const x: any = 5;`);
    const varNodes = nodes.filter(n => n.kind === 'var');
    expect(varNodes.length).toBe(1);
    expect(varNodes[0].status).toBe(AnnotationStatus.any);
    expect(varNodes[0].issue).toBe(IssueType.any);
  });

  it('handles variable declaration with unknown type', () => {
    const nodes = parseSource(`const x: unknown = null;`);
    const varNodes = nodes.filter(n => n.kind === 'var');
    expect(varNodes.length).toBe(1);
    expect(varNodes[0].status).toBe(AnnotationStatus.unknown);
    expect(varNodes[0].issue).toBe(IssueType.unknown);
  });

  it('handles arrow function with default param', () => {
    const nodes = parseSource(`const fn = (x: number = 5): number => x;`);
    const retNodes = nodes.filter(n => n.kind === 'return');
    const paramNodes = nodes.filter(n => n.kind === 'param');
    expect(retNodes.length).toBe(1);
    expect(paramNodes.length).toBe(1);
    expect(paramNodes[0].status).toBe(AnnotationStatus.explicit);
  });

  it('handles arrow function default param without type', () => {
    const nodes = parseSource(`const fn = (x = 5) => x;`);
    const paramNodes = nodes.filter(n => n.kind === 'param');
    expect(paramNodes.length).toBe(1);
    expect(paramNodes[0].status).toBe(AnnotationStatus.implicit);
  });
});

describe('classifyTypeAnnotation for TSInferType', () => {
  it('classifies type query', () => {
    const nodes = parseSource(`function take(v: typeof window): void {}`);
    expect(nodes.length).toBeGreaterThan(0);
  });

  it('classifies tuple types', () => {
    const nodes = parseSource(`function tuple(x: [number, string]): void {}`);
    const paramNodes = nodes.filter(n => n.kind === 'param');
    expect(paramNodes.length).toBeGreaterThan(0);
    expect(paramNodes[0].status).toBe(AnnotationStatus.explicit);
  });

  it('classifies function types as parameters', () => {
    const nodes = parseSource(`function fn(cb: (x: number) => void): void {}`);
    const paramNodes = nodes.filter(n => n.kind === 'param');
    expect(paramNodes.length).toBeGreaterThan(0);
    expect(paramNodes[0].status).toBe(AnnotationStatus.explicit);
  });

  it('classifies optional types', () => {
    const nodes = parseSource(`function fn(x?: string): void {}`);
    const paramNodes = nodes.filter(n => n.kind === 'param');
    expect(paramNodes.length).toBeGreaterThan(0);
    expect(paramNodes[0].status).toBe(AnnotationStatus.explicit);
  });

  it('classifies intersection types', () => {
    const nodes = parseSource(`function fn(x: A & B): void {}`);
    const paramNodes = nodes.filter(n => n.kind === 'param');
    expect(paramNodes.length).toBeGreaterThan(0);
    expect(paramNodes[0].status).toBe(AnnotationStatus.explicit);
  });

  it('classifies TSDeclareFunction', () => {
    const nodes = parseSource(`declare function external(x: any): unknown;`);
    expect(nodes.length).toBeGreaterThan(0);
    const paramNodes = nodes.filter(n => n.kind === 'param');
    expect(paramNodes[0].status).toBe(AnnotationStatus.any);
    const retNodes = nodes.filter(n => n.kind === 'return');
    expect(retNodes[0].status).toBe(AnnotationStatus.unknown);
  });
});

describe('classifyTypeAnnotation for nested weak types', () => {
  it.each([
    ['property', '{ value: any }', AnnotationStatus.any],
    ['unknown property', '{ value: unknown }', AnnotationStatus.unknown],
    ['method parameter', '{ parse(value: any): string }', AnnotationStatus.any],
    ['method return', '{ parse(value: string): unknown }', AnnotationStatus.unknown],
    ['index signature parameter', '{ [key: any]: string }', AnnotationStatus.any],
    ['index signature value', '{ [key: string]: unknown }', AnnotationStatus.unknown],
    ['fully typed object', '{ value: string; parse(value: number): boolean; [key: string]: string }', AnnotationStatus.explicit],
  ])('classifies an object type with a %s', (_name, annotation, expected) => {
    const nodes = parseSource(`const value: ${annotation} = {} as ${annotation};`);
    expect(nodes.find(node => node.kind === 'var')?.status).toBe(expected);
  });

  it.each([
    ['any parameter', '(value: any) => string', AnnotationStatus.any],
    ['unknown parameter', '(value: unknown) => string', AnnotationStatus.unknown],
    ['any return', '(value: string) => any', AnnotationStatus.any],
    ['unknown return', '(value: string) => unknown', AnnotationStatus.unknown],
    ['fully typed function', '(value: string) => boolean', AnnotationStatus.explicit],
  ])('classifies a function type with an %s', (_name, annotation, expected) => {
    const nodes = parseSource(`const callback: ${annotation} = value => value as never;`);
    expect(nodes.find(node => node.kind === 'var')?.status).toBe(expected);
  });

  it.each([
    '{ first: unknown; second: any }',
    '{ first: any; second: unknown }',
    '(first: unknown, second: any) => unknown',
    '(first: any, second: unknown) => unknown',
  ])('gives any deterministic precedence within %s', annotation => {
    const nodes = parseSource(`const value: ${annotation} = null as never;`);
    expect(nodes.find(node => node.kind === 'var')?.status).toBe(AnnotationStatus.any);
  });

  it('preserves nested generic classification', () => {
    const nodes = parseSource('const value: Promise<any> = Promise.resolve(1);');
    expect(nodes.find(node => node.kind === 'var')?.status).toBe(AnnotationStatus.any);
  });
});

describe('extractTypeName for edge cases', () => {
  const opts = { loc: true, range: true, jsx: false, tokens: false, comment: false };

  function parseType(typeStr: string): TSESTree.TypeNode {
    const code = `const x: ${typeStr} = null`;
    const ast = parse(code, opts) as TSESTree.Program;
    const varDecl = ast.body[0] as TSESTree.VariableDeclaration;
    const decl = varDecl.declarations[0] as TSESTree.VariableDeclarator;
    const ident = decl.id as TSESTree.Identifier;
    return (ident.typeAnnotation!.typeAnnotation) as TSESTree.TypeNode;
  }

  it('extracts boolean type', () => {
    expect(extractTypeName(parseType('boolean'))).toBe('boolean');
  });

  it('extracts void type', () => {
    expect(extractTypeName(parseType('void'))).toBe('void');
  });

  it('extracts null type', () => {
    expect(extractTypeName(parseType('null'))).toBe('null');
  });

  it('extracts undefined type', () => {
    expect(extractTypeName(parseType('undefined'))).toBe('undefined');
  });

  it('extracts never type', () => {
    expect(extractTypeName(parseType('never'))).toBe('never');
  });

  it('extracts tuple type', () => {
    expect(extractTypeName(parseType('[number, string]'))).toBe('tuple');
  });

  it('extracts intersection type', () => {
    const name = extractTypeName(parseType('A & B'));
    expect(name).toMatch(/A.*B|B.*A/);
  });

  it('extracts literal type', () => {
    expect(extractTypeName(parseType('"hello"'))).toBe('literal');
  });

  it('extracts object type literal', () => {
    expect(extractTypeName(parseType('{ x: number }'))).toBe('object');
  });

  it('extracts function type', () => {
    expect(extractTypeName(parseType('() => void'))).toBe('function');
  });

  it('extracts qualified name', () => {
    const name = extractTypeName(parseType('NS.Member'));
    expect(name).toBe('Member');
  });
});
