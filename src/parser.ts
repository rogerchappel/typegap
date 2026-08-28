/**
 * AST Parser — parses .ts / .tsx files and walks the AST
 * to find all annotatable locations and classify their annotation status.
 */

import { readFileSync } from 'node:fs';
import { parse } from '@typescript-eslint/typescript-estree';
import type { TSESTreeOptions, TSESTree } from '@typescript-eslint/typescript-estree';
import { AnnotationStatus, IssueType, type NodeInfo } from './types.js';

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

/** Parse a file and return all annotatable node info entries */
export function parseFile(filePath: string): NodeInfo[] {
  const source = readFileSync(filePath, 'utf-8');
  const ast = parse(source, ESTREE_OPTIONS);
  return walk(ast as TSESTree.Program, filePath);
}

/** Parse a raw source string (useful for testing) */
export function parseSource(source: string, filePath = 'test.ts'): NodeInfo[] {
  const ast = parse(source, ESTREE_OPTIONS);
  return walk(ast as TSESTree.Program, filePath);
}

const ESTREE_OPTIONS: TSESTreeOptions = {
  loc: true,
  range: true,
  jsx: true,
  tokens: false,
  comment: false,
};

/* ------------------------------------------------------------------ */
/* Walkers                                                            */
/* ------------------------------------------------------------------ */

function walk(program: TSESTree.Program, file: string): NodeInfo[] {
  const nodes: NodeInfo[] = [];
  visit(program, file, nodes, null);
  return nodes;
}

function visit(node: TSESTree.Node, file: string, nodes: NodeInfo[], parent: TSESTree.Node | null): void {
  switch (node.type) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
      handleFunction(node as TSESTree.FunctionDeclaration | TSESTree.FunctionExpression, file, nodes, parent);
      break;

    case 'ArrowFunctionExpression':
      handleArrow(node as TSESTree.ArrowFunctionExpression, file, nodes);
      break;

    case 'VariableDeclaration':
      handleVariableDeclaration(node as TSESTree.VariableDeclaration, file, nodes);
      break;

    case 'TSDeclareFunction':
      handleTSDeclareFunction(node as TSESTree.TSDeclareFunction, file, nodes);
      break;

    case 'CatchClause':
      handleCatchClause(node as TSESTree.CatchClause, file, nodes);
      break;

    case 'PropertyDefinition':
      handleClassField(node as TSESTree.PropertyDefinition, file, nodes);
      break;

    case 'TSInterfaceDeclaration':
      handleObjectMembers((node as TSESTree.TSInterfaceDeclaration).body.body, file, nodes);
      break;

    case 'TSTypeAliasDeclaration': {
      const annotation = (node as TSESTree.TSTypeAliasDeclaration).typeAnnotation;
      if (annotation.type === 'TSTypeLiteral') handleObjectMembers(annotation.members, file, nodes);
      break;
    }
  }

  // Recurse into children
  const keys = Object.keys(node) as Array<keyof TSESTree.Node>;
  for (const key of keys) {
    if (key === 'parent' || key === 'loc' || key === 'range') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const c of child) {
        if (c && typeof c === 'object' && 'type' in c) {
          visit(c as TSESTree.Node, file, nodes, node);
        }
      }
    } else if (child && typeof child === 'object' && 'type' in child) {
      visit(child as TSESTree.Node, file, nodes, node);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Node handlers                                                      */
/* ------------------------------------------------------------------ */

function handleFunction(
  node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression,
  file: string,
  nodes: NodeInfo[],
  parentNode: TSESTree.Node | null,
): void {
  const name = node.id?.name ?? '(anonymous)';
  const line = node.loc?.start.line ?? 0;

  // Skip constructors — they cannot have return type annotations
  if (parentNode?.type === 'MethodDefinition' && (parentNode as TSESTree.MethodDefinition).kind === 'constructor') {
    handleParams(node.params, file, nodes);
    return;
  }

  // Return type
  const retStatus = node.returnType
    ? classifyTypeAnnotation(node.returnType.typeAnnotation)
    : AnnotationStatus.implicit;
  nodes.push(makeNode(file, line, 'return', `${name}() return`, retStatus));

  // Parameters
  handleParams(node.params, file, nodes);
}

function handleArrow(node: TSESTree.ArrowFunctionExpression, file: string, nodes: NodeInfo[]): void {
  const line = node.loc?.start.line ?? 0;

  const retStatus = node.returnType
    ? classifyTypeAnnotation(node.returnType.typeAnnotation)
    : AnnotationStatus.implicit;
  nodes.push(makeNode(file, line, 'return', '() => return', retStatus));

  handleParams(node.params, file, nodes);
}

function handleTSDeclareFunction(node: TSESTree.TSDeclareFunction, file: string, nodes: NodeInfo[]): void {
  const name = node.id?.name ?? '(anonymous)';
  const line = node.loc?.start.line ?? 0;

  const retStatus = node.returnType
    ? classifyTypeAnnotation(node.returnType.typeAnnotation)
    : AnnotationStatus.implicit;
  nodes.push(makeNode(file, line, 'return', `${name}() return`, retStatus));
  handleParams(node.params, file, nodes);
}

function handleCatchClause(node: TSESTree.CatchClause, file: string, nodes: NodeInfo[]): void {
  if (!node.param) return;
  const param = node.param;
  const line = param.loc?.start.line ?? 0;

  if (param.type === 'Identifier') {
    if (param.typeAnnotation) {
      const status = classifyTypeAnnotation(param.typeAnnotation.typeAnnotation);
      nodes.push(makeNode(file, line, 'param', param.name, status));
    } else {
      nodes.push(makeNode(file, line, 'param', param.name, AnnotationStatus.implicit));
    }
  } else if (param.type === 'ObjectPattern') {
    if (param.typeAnnotation) {
      const status = classifyTypeAnnotation(param.typeAnnotation.typeAnnotation);
      nodes.push(makeNode(file, line, 'param', '{...}', status));
    } else {
      nodes.push(makeNode(file, line, 'param', '{...}', AnnotationStatus.implicit));
    }
  } else if (param.type === 'ArrayPattern') {
    if (param.typeAnnotation) {
      const status = classifyTypeAnnotation(param.typeAnnotation.typeAnnotation);
      nodes.push(makeNode(file, line, 'param', '[...]', status));
    } else {
      nodes.push(makeNode(file, line, 'param', '[...]', AnnotationStatus.implicit));
    }
  }
}

function handleVariableDeclaration(
  node: TSESTree.VariableDeclaration,
  file: string,
  nodes: NodeInfo[],
): void {
  for (const decl of node.declarations) {
    if (decl.id.type === 'Identifier' && decl.id.typeAnnotation) {
      const status = classifyTypeAnnotation(decl.id.typeAnnotation.typeAnnotation);
      const line = decl.id.loc?.start.line ?? 0;
      nodes.push(makeNode(file, line, 'var', decl.id.name, status));
    }

    if ((decl.id.type === 'ObjectPattern' || decl.id.type === 'ArrayPattern') && decl.id.typeAnnotation) {
      const line = decl.id.loc?.start.line ?? 0;
      const status = classifyTypeAnnotation(decl.id.typeAnnotation.typeAnnotation);
      const label = decl.id.type === 'ObjectPattern' ? '{...}' : '[...]';
      nodes.push(makeNode(file, line, 'var', label, status));
    }
  }
}

function handleClassField(
  node: TSESTree.PropertyDefinition,
  file: string,
  nodes: NodeInfo[],
): void {
  if (!node.typeAnnotation) return;

  nodes.push(makeNode(
    file,
    node.loc?.start.line ?? 0,
    'property',
    classFieldName(node.key),
    classifyTypeAnnotation(node.typeAnnotation.typeAnnotation),
  ));
}

function handleObjectMembers(
  members: TSESTree.TypeElement[],
  file: string,
  nodes: NodeInfo[],
): void {
  for (const member of members) {
    if (member.type === 'TSPropertySignature' && member.typeAnnotation) {
      nodes.push(makeNode(
        file,
        member.loc?.start.line ?? 0,
        'property',
        memberName(member.key),
        classifyTypeAnnotation(member.typeAnnotation.typeAnnotation),
      ));
    } else if (member.type === 'TSMethodSignature') {
      const name = memberName(member.key);
      const status = member.returnType
        ? classifyTypeAnnotation(member.returnType.typeAnnotation)
        : AnnotationStatus.implicit;
      nodes.push(makeNode(file, member.loc?.start.line ?? 0, 'return', `${name}() return`, status));
      handleParams(member.params, file, nodes);
    } else if (member.type === 'TSIndexSignature') {
      const status = member.typeAnnotation
        ? classifyTypeAnnotation(member.typeAnnotation.typeAnnotation)
        : AnnotationStatus.implicit;
      nodes.push(makeNode(file, member.loc?.start.line ?? 0, 'return', '[index] value', status));
      handleParams(member.parameters, file, nodes);
    }
  }
}

function memberName(key: TSESTree.PropertyName): string {
  if (key.type === 'Identifier') return key.name;
  if (key.type === 'Literal') return String(key.value);
  return '[computed]';
}

function classFieldName(key: TSESTree.PropertyDefinition['key']): string {
  if (key.type === 'PrivateIdentifier') return `#${key.name}`;
  return memberName(key);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function handleParams(
  params: TSESTree.Parameter[],
  file: string,
  nodes: NodeInfo[],
): void {
  for (const param of params) {
    const line = param.loc?.start.line ?? 0;

    if (param.type === 'Identifier') {
      if (param.typeAnnotation) {
        const status = classifyTypeAnnotation(param.typeAnnotation.typeAnnotation);
        nodes.push(makeNode(file, line, 'param', param.name, status));
      } else {
        nodes.push(makeNode(file, line, 'param', param.name, AnnotationStatus.implicit));
      }
    } else if (param.type === 'AssignmentPattern' && param.left.type === 'Identifier') {
      if (param.left.typeAnnotation) {
        const status = classifyTypeAnnotation(param.left.typeAnnotation.typeAnnotation);
        nodes.push(makeNode(file, line, 'param', param.left.name, status));
      } else {
        nodes.push(makeNode(file, line, 'param', param.left.name, AnnotationStatus.implicit));
      }
    } else if (param.type === 'RestElement' && param.argument.type === 'Identifier') {
      // typeAnnotation can be on the RestElement itself or on the argument
      const typeAnn = param.typeAnnotation || param.argument.typeAnnotation;
      if (typeAnn) {
        const status = classifyTypeAnnotation(typeAnn.typeAnnotation);
        nodes.push(makeNode(file, line, 'param', `...${param.argument.name}`, status));
      } else {
        nodes.push(makeNode(file, line, 'param', `...${param.argument.name}`, AnnotationStatus.implicit));
      }
    } else if (param.type === 'ObjectPattern' || param.type === 'ArrayPattern') {
      const label = param.type === 'ObjectPattern' ? '{...}' : '[...]';
      if (param.typeAnnotation) {
        const status = classifyTypeAnnotation(param.typeAnnotation.typeAnnotation);
        nodes.push(makeNode(file, line, 'param', label, status));
      } else {
        nodes.push(makeNode(file, line, 'param', label, AnnotationStatus.implicit));
      }
    }
  }
}

/** Classify a TSType's annotation status */
export function classifyTypeAnnotation(typeNode: TSESTree.TypeNode): AnnotationStatus {
  if (typeNode.type === 'TSAnyKeyword') return AnnotationStatus.any;
  if (typeNode.type === 'TSUnknownKeyword') return AnnotationStatus.unknown;

  // TSTypeReference — check for nested any/unknown in type params
  if (typeNode.type === 'TSTypeReference') {
    const ref = typeNode as TSESTree.TSTypeReference;
    if (ref.typeArguments) {
      return combineWeakStatuses(ref.typeArguments.params.map(classifyTypeAnnotation));
    }
    return AnnotationStatus.explicit;
  }

  // TSUnionType / TSIntersectionType
  if (typeNode.type === 'TSUnionType' || typeNode.type === 'TSIntersectionType') {
    const types = (typeNode as TSESTree.TSUnionType | TSESTree.TSIntersectionType).types;
    return combineWeakStatuses(types.map(classifyTypeAnnotation));
  }

  // TSArrayType → check elementType
  if (typeNode.type === 'TSArrayType') {
    return classifyTypeAnnotation((typeNode as TSESTree.TSArrayType).elementType);
  }

  // TSFunctionType → check parameters and return type
  if (typeNode.type === 'TSFunctionType') {
    const fn = typeNode as TSESTree.TSFunctionType;
    return classifyFunctionTypeParts(fn.params, fn.returnType);
  }

  // TSTypeLiteral → check every annotated member component
  if (typeNode.type === 'TSTypeLiteral') {
    const statuses = (typeNode as TSESTree.TSTypeLiteral).members.map(member => {
      if (member.type === 'TSPropertySignature') {
        return member.typeAnnotation
          ? classifyTypeAnnotation(member.typeAnnotation.typeAnnotation)
          : AnnotationStatus.explicit;
      }
      if (member.type === 'TSMethodSignature') {
        return classifyFunctionTypeParts(member.params, member.returnType);
      }
      if (member.type === 'TSIndexSignature') {
        return combineWeakStatuses([
          ...member.parameters.map(classifyParameterType),
          member.typeAnnotation
            ? classifyTypeAnnotation(member.typeAnnotation.typeAnnotation)
            : AnnotationStatus.explicit,
        ]);
      }
      return classifyFunctionTypeParts(member.params, member.returnType);
    });
    return combineWeakStatuses(statuses);
  }

  // TSTupleType
  if (typeNode.type === 'TSTupleType') {
    const elements = (typeNode as TSESTree.TSTupleType).elementTypes;
    for (const el of elements) {
      if ('type' in el && typeof el === 'object') {
        const s = classifyTypeAnnotation(el as TSESTree.TypeNode);
        if (s !== AnnotationStatus.explicit) return s;
      }
    }
    return AnnotationStatus.explicit;
  }

  // TSConditionalType
  if (typeNode.type === 'TSConditionalType') {
    const ct = typeNode as TSESTree.TSConditionalType;
    const results = [ct.checkType, ct.extendsType, ct.trueType, ct.falseType];
    for (const r of results) {
      const s = classifyTypeAnnotation(r);
      if (s !== AnnotationStatus.explicit) return s;
    }
    return AnnotationStatus.explicit;
  }

  // TSConstructorType
  if (typeNode.type === 'TSConstructorType') {
    const ct = typeNode as TSESTree.TSConstructorType;
    if (ct.returnType) return classifyTypeAnnotation(ct.returnType.typeAnnotation);
    return AnnotationStatus.explicit;
  }

  // TSMappedType
  if (typeNode.type === 'TSMappedType') {
    const mt = typeNode as TSESTree.TSMappedType;
    if (mt.typeAnnotation) return classifyTypeAnnotation(mt.typeAnnotation);
    return AnnotationStatus.explicit;
  }

  // TSIndexedAccessType
  if (typeNode.type === 'TSIndexedAccessType') {
    const iat = typeNode as TSESTree.TSIndexedAccessType;
    const obj = classifyTypeAnnotation(iat.objectType);
    if (obj !== AnnotationStatus.explicit) return obj;
    return classifyTypeAnnotation(iat.indexType);
  }

  // TSImportType
  if (typeNode.type === 'TSImportType') {
    const it = typeNode as TSESTree.TSImportType;
    if (it.typeArguments) {
      for (const p of it.typeArguments.params) {
        const s = classifyTypeAnnotation(p);
        if (s !== AnnotationStatus.explicit) return s;
      }
    }
    return AnnotationStatus.explicit;
  }

  // TSOptionalType / TSRestType
  if (typeNode.type === 'TSOptionalType') {
    const ot = typeNode as TSESTree.TSOptionalType;
    return classifyTypeAnnotation(ot.typeAnnotation);
  }
  if (typeNode.type === 'TSRestType') {
    const rt = typeNode as TSESTree.TSRestType;
    return classifyTypeAnnotation(rt.typeAnnotation);
  }

  // TSTypeOperator
  if (typeNode.type === 'TSTypeOperator') {
    const operator = typeNode as TSESTree.TSTypeOperator;
    return operator.typeAnnotation
      ? classifyTypeAnnotation(operator.typeAnnotation)
      : AnnotationStatus.explicit;
  }

  // TSNamedTupleMember
  if (typeNode.type === 'TSNamedTupleMember') {
    const ntm = typeNode as TSESTree.TSNamedTupleMember;
    return classifyTypeAnnotation(ntm.elementType);
  }

  // TSInferType and TSIndexedAccessType are handled above
  // Everything else is explicit
  return AnnotationStatus.explicit;
}

function classifyFunctionTypeParts(
  params: TSESTree.Parameter[],
  returnType: TSESTree.TSTypeAnnotation | undefined,
): AnnotationStatus {
  return combineWeakStatuses([
    ...params.map(classifyParameterType),
    returnType
      ? classifyTypeAnnotation(returnType.typeAnnotation)
      : AnnotationStatus.explicit,
  ]);
}

function classifyParameterType(param: TSESTree.Parameter): AnnotationStatus {
  if (param.type === 'TSParameterProperty') {
    return classifyParameterType(param.parameter);
  }
  if (param.type === 'AssignmentPattern') {
    return classifyParameterType(param.left as TSESTree.Parameter);
  }
  if (param.type === 'RestElement') {
    if (param.typeAnnotation) {
      return classifyTypeAnnotation(param.typeAnnotation.typeAnnotation);
    }
    return classifyParameterType(param.argument as TSESTree.Parameter);
  }
  return param.typeAnnotation
    ? classifyTypeAnnotation(param.typeAnnotation.typeAnnotation)
    : AnnotationStatus.explicit;
}

/** Prefer any over unknown regardless of the order in which nested types appear. */
function combineWeakStatuses(statuses: AnnotationStatus[]): AnnotationStatus {
  if (statuses.includes(AnnotationStatus.any)) return AnnotationStatus.any;
  if (statuses.includes(AnnotationStatus.unknown)) return AnnotationStatus.unknown;
  return AnnotationStatus.explicit;
}

/** Create a NodeInfo with issue mapped from status */
function makeNode(
  file: string,
  line: number,
  kind: string,
  name: string,
  status: AnnotationStatus,
): NodeInfo {
  const issue = status !== AnnotationStatus.explicit ? statusToIssue(status) : undefined;
  const typeName = issue !== undefined ? status : undefined;
  return { file, line, kind, name, status, issue, typeName };
}

function statusToIssue(status: AnnotationStatus): IssueType {
  switch (status) {
    case AnnotationStatus.any: return IssueType.any;
    case AnnotationStatus.unknown: return IssueType.unknown;
    case AnnotationStatus.implicit: return IssueType.implicit;
    default: return IssueType.implicit;
  }
}

/** Extract a human-readable type name from a TSType */
export function extractTypeName(typeNode: TSESTree.TypeNode): string {
  switch (typeNode.type) {
    case 'TSAnyKeyword': return 'any';
    case 'TSUnknownKeyword': return 'unknown';
    case 'TSStringKeyword': return 'string';
    case 'TSNumberKeyword': return 'number';
    case 'TSBooleanKeyword': return 'boolean';
    case 'TSVoidKeyword': return 'void';
    case 'TSNullKeyword': return 'null';
    case 'TSUndefinedKeyword': return 'undefined';
    case 'TSNeverKeyword': return 'never';
    case 'TSTypeReference': {
      const ref = typeNode as TSESTree.TSTypeReference;
      const name = ref.typeName.type === 'Identifier'
        ? ref.typeName.name
        : ref.typeName.type === 'TSQualifiedName'
          ? (ref.typeName.right as TSESTree.Identifier).name
          : '?';
      return name;
    }
    case 'TSArrayType':
      return `${extractTypeName((typeNode as TSESTree.TSArrayType).elementType)}[]`;
    case 'TSUnionType':
      return (typeNode as TSESTree.TSUnionType).types.map(t => extractTypeName(t)).join(' | ');
    case 'TSIntersectionType':
      return (typeNode as TSESTree.TSIntersectionType).types.map(t => extractTypeName(t)).join(' & ');
    case 'TSFunctionType': return 'function';
    case 'TSConstructorType': return 'constructor';
    case 'TSLiteralType': return 'literal';
    case 'TSTypeLiteral': return 'object';
    case 'TSTupleType': return 'tuple';
    case 'TSTypeQuery': return 'typeof';
    default:
      return typeNode.type.replace(/^TS/, '').replace(/Keyword$/, '').toLowerCase();
  }
}
