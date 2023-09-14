import {
  ArrayType,
  DeclarationReflection,
  IntersectionType,
  IntrinsicType,
  LiteralType,
  ReferenceType,
  SomeType,
  UnionType,
} from "typedoc";
import { PlatformSpecificFileDeclarationReflection } from './get-definitions/get-types-from-platform-specific-upscaler-files.js';

export type DecRef = DeclarationReflection | PlatformSpecificFileDeclarationReflection;
export interface Definitions {
  constructors: Record<string, DecRef>;
  methods: Record<string, DecRef>;
  interfaces: Record<string, DecRef>;
  types: Record<string, DecRef>;
  classes: Record<string, DecRef>;
  functions: Record<string, DecRef>;
  enums: Record<string, DecRef>;
}

export const isDeclarationReflection = (reflection?: DecRef): reflection is DeclarationReflection => reflection?.kind !== 'Platform Specific Type';
export const isArrayType = (type: SomeType): type is ArrayType => type.type === 'array';
export const isReferenceType = (type: SomeType): type is ReferenceType => type.type === 'reference';
export const isLiteralType = (type: SomeType): type is LiteralType => type.type === 'literal';
export const isInstrinsicType = (type: SomeType): type is IntrinsicType => type.type === 'intrinsic';
export const isUnionType = (type: SomeType): type is UnionType => type.type === 'union';
export const isIntersectionType = (type: SomeType): type is IntersectionType => type.type === 'intersection';
export const getLiteralTypeValue = (type: LiteralType): string => {
  const { value } = type;
  if (typeof value === 'number') {
    return `${value}`;
  } else if (typeof value === 'string') {
    return value;
  }

  throw new Error('Not yet implemented for literal');
};
