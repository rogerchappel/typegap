export { analyzeDirectory, analyzeFiles, buildFileResult, buildProjectResult } from './analyzer.js';
export { parseFile, parseSource, classifyTypeAnnotation, extractTypeName } from './parser.js';
export {
  compareWithBaseline,
  generateReport,
  getBaselineComparison,
  loadBaseline,
  saveBaseline,
  type ReportOptions,
} from './reporter.js';
export type { Baseline, BaselineComparison, FileResult, NodeInfo, ProjectResult } from './types.js';
export { AnnotationStatus, IssueType } from './types.js';
