import { ReflectionKind } from "typedoc";
import { Definitions, isPlatformSpecificFileDeclarationReflection } from "../types.js";
import { getAllDeclarationReflections } from "./get-all-declaration-reflections.js";
import {  } from "./get-types-from-platform-specific-upscaler-files.js";

export const KindStringKey: Partial<Record<ReflectionKind, keyof Definitions>> = {
  [ReflectionKind.Constructor]: 'constructors',
  [ReflectionKind.Method]: 'methods',
  [ReflectionKind.Interface]: 'interfaces',
  [ReflectionKind.TypeAlias]: 'types',
  [ReflectionKind.Class]: 'classes',
  [ReflectionKind.Function]: 'functions',
  [ReflectionKind.Enum]: 'enums',
}

const getKindStringKey = (kindString: ReflectionKind): keyof Definitions => {
  const nameOfKind = KindStringKey[kindString];
  if (!nameOfKind) {
    throw new Error(`Unexpected kind string: ${kindString}`);
  }
  return nameOfKind;
};

export const getDefinitions = async (): Promise<Definitions> => {
  const children = await getAllDeclarationReflections();
  const definitions: Definitions = {
    constructors: {},
    methods: {},
    functions: {},
    interfaces: {},
    types: {},
    classes: {},
    enums: {},
  };
  for (const child of children) {
    const { name, kind } = isPlatformSpecificFileDeclarationReflection(child) ? child.declarationReflection : child;
    definitions[getKindStringKey(kind)][name] = child;
  }
  return definitions;
}

