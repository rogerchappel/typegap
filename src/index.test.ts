import { describe, expect, it } from 'vitest';
import * as api from './index.js';

describe('public API', () => {
  it('exports runtime helpers', () => {
    expect(api.analyzeDirectory).toBeTypeOf('function');
    expect(api.analyzeFiles).toBeTypeOf('function');
    expect(api.buildFileResult).toBeTypeOf('function');
    expect(api.buildProjectResult).toBeTypeOf('function');
    expect(api.parseFile).toBeTypeOf('function');
    expect(api.parseSource).toBeTypeOf('function');
    expect(api.classifyTypeAnnotation).toBeTypeOf('function');
    expect(api.extractTypeName).toBeTypeOf('function');
    expect(api.compareWithBaseline).toBeTypeOf('function');
    expect(api.generateReport).toBeTypeOf('function');
    expect(api.getBaselineComparison).toBeTypeOf('function');
    expect(api.loadBaseline).toBeTypeOf('function');
    expect(api.saveBaseline).toBeTypeOf('function');
  });

  it('exports enums', () => {
    expect(api.AnnotationStatus.explicit).toBe('explicit');
    expect(api.IssueType.any).toBe('any');
  });
});
