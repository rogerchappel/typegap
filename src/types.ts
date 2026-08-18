/**
 * Core types for the typegap audit engine.
 */

/** How a type annotation is classified */
export enum AnnotationStatus {
  /** Explicitly annotated with a specific type */
  explicit = 'explicit',
  /** Annotated as `any` */
  any = 'any',
  /** Annotated as `unknown` */
  unknown = 'unknown',
  /** No annotation exists (implicit any / missing return type) */
  implicit = 'implicit',
}

/** What kind of issue a node represents */
export enum IssueType {
  /** Uses `any` */
  any = 'any',
  /** Uses `unknown` */
  unknown = 'unknown',
  /** No type annotation — implicit */
  implicit = 'implicit',
}

/** A single audit entry for an annotatable AST node */
export interface NodeInfo {
  /** File path */
  file: string;
  /** 1-based line number */
  line: number;
  /** Node kind hint (param, return, var, property, binding-param, generic-arg) */
  kind: string;
  /** The name or description of the node */
  name: string;
  /** Type annotation status */
  status: AnnotationStatus;
  /** Issue type (if problematic) */
  issue?: IssueType;
  /** Optional type string (e.g. "number", "string", "any") */
  typeName?: string;
}

/** Aggregated result for a single file */
export interface FileResult {
  file: string;
  total: number;
  annotated: number;
  anyCount: number;
  unknownCount: number;
  implicitCount: number;
  coverage: number;
  nodes: NodeInfo[];
}

/** Aggregated project result */
export interface ProjectResult {
  files: FileResult[];
  total: number;
  annotated: number;
  anyCount: number;
  unknownCount: number;
  implicitCount: number;
  coverage: number;
}

/** JSON-serialisable baseline for --baseline / --compare */
export interface Baseline {
  version: number;
  total: number;
  annotated: number;
  coverage: number;
  anyCount: number;
  unknownCount: number;
  implicitCount: number;
  files: Array<{
    file: string;
    total: number;
    annotated: number;
    coverage: number;
  }>;
  timestamp: string;
}

/** Machine-readable baseline comparison summary */
export interface BaselineComparison {
  baselineTimestamp: string;
  coverageBefore: number;
  coverageCurrent: number;
  coverageDelta: number;
  files: Array<{
    file: string;
    coverageBefore?: number;
    coverageCurrent?: number;
    coverageDelta?: number;
    status: 'changed' | 'new' | 'removed';
  }>;
}
