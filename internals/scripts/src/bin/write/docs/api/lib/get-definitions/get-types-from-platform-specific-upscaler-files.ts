import { TFJSLibrary } from "@internals/common/tfjs-library";
import { DeclarationReflection, ReflectionKind, SomeType } from "typedoc";
import { getPackageAsTree } from "./get-package-as-tree.js";
import { UPSCALER_DIR } from "@internals/common/constants";
import path from "path";
import { PlatformSpecificFileDeclarationReflection } from "../types.js";

export interface PlatformSpecificFileDefinition {
  fileName: string;
  typeName: string;
}

const tfjsLibraries: TFJSLibrary[] = ['browser', 'node'];

const reverseKindStringKey: Record<string, ReflectionKind> = {
  constructors: ReflectionKind.Constructor,
  methods: ReflectionKind.Method,
  interfaces: ReflectionKind.Interface,
  types: ReflectionKind.TypeAlias,
  classes: ReflectionKind.Class,
  functions: ReflectionKind.Function,
  enums: ReflectionKind.Enum,
};

export const makeDeclarationReflection = (typeName: string, type: SomeType): DeclarationReflection => {
  if (type.type === 'union') {
    // const childType = type.types?.[0];
    // console.log(typeName, type.types);
    // if (!childType) {
    //   throw new Error('No child type for union');
    // }
    // return makeDeclarationReflection(typeName, childType);
    const declarationReflection = new DeclarationReflection(typeName, ReflectionKind.Interface);
    declarationReflection.type = type;
    return declarationReflection;
  }
  const kind = reverseKindStringKey[type.type];
  if (kind === undefined) {
    throw new Error(`Kind is undefined for type ${type.type}`);
  }
  const declarationReflection = new DeclarationReflection(typeName, kind);
  declarationReflection.type = type;
  return declarationReflection;
};

export const getPlatformSpecificUpscalerDeclarationReflections = (
  tfjsLibrary: TFJSLibrary, {
    fileName,
    typeName,
  }: PlatformSpecificFileDefinition
): DeclarationReflection => {
  // await scaffoldUpscaler(tfjsLibrary);
  const { children } = getPackageAsTree(
    path.resolve(UPSCALER_DIR, 'src', `${fileName}.${tfjsLibrary}.ts`),
    path.resolve(UPSCALER_DIR, `tsconfig.docs.${tfjsLibrary}.json`),
    UPSCALER_DIR,
  );
  const matchingType = children?.filter(child => child.name === typeName).pop();
  if (!matchingType) {
    throw new Error(`Could not find input from ${fileName}.${tfjsLibrary}.ts`);
  }
  return matchingType;
};

export const getTypesFromPlatformSpecificUpscalerFile = ({ fileName, typeName }: PlatformSpecificFileDefinition) => {
  const [browser, node] = tfjsLibraries.map(tfjsLibrary => getPlatformSpecificUpscalerDeclarationReflections(tfjsLibrary, { fileName, typeName }));
  if (browser.type?.type !== node.type?.type) {
    throw new Error([
      'Some mismatch for file name',
      fileName,
      'and type name',
      typeName,
      'between browser type:', 
      `\n\n${JSON.stringify(browser.type)}\n\n`, 
      'and node type:',
      `\n\n${JSON.stringify(node.type)}`,
    ].join(' '));
  }

  const type = browser.type;
  if (!type) {
    throw new Error('No type defined on browser type');
  }

  return {
    declarationReflection: makeDeclarationReflection(typeName, type),
    browser,
    node,
  };
};

export const getTypesFromPlatformSpecificUpscalerFiles = (
  fileNames: PlatformSpecificFileDefinition[]
): Promise<PlatformSpecificFileDeclarationReflection[]> => Promise.all(fileNames.map(getTypesFromPlatformSpecificUpscalerFile));
