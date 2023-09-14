import { TFJSLibrary } from "@internals/common/tfjs-library";
import { DeclarationReflection, ReflectionKind, SomeType } from "typedoc";
import { scaffoldUpscaler } from "../../../../../../commands/scaffold/upscaler.js";
import { getPackageAsTree } from "./get-package-as-tree.js";
import { UPSCALER_DIR } from "@internals/common/constants";
import path from "path";

export interface PlatformSpecificFileDeclarationReflection {
  declarationReflection: DeclarationReflection;
  browser: DeclarationReflection;
  node: DeclarationReflection;
}

export interface PlatformSpecificFileDefinition {
  fileName: string;
  typeName: string;
}

const tfjsLibraries: TFJSLibrary[] = ['browser', 'node'];

export const isPlatformSpecificFileDeclarationReflection = (
  child: DeclarationReflection | PlatformSpecificFileDeclarationReflection
): child is PlatformSpecificFileDeclarationReflection => 'browser' in child;

export const makeDeclarationReflection = (typeName: string, kind: ReflectionKind, type?: SomeType) => {
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
  if (browser.type !== node.type) {
    throw new Error('Some mismatch between browser and node types');
  }

  return {
    declarationReflection: makeDeclarationReflection(typeName, ReflectionKind.Function, browser.type),
    browser,
    node,
  };
};

export const getTypesFromPlatformSpecificUpscalerFiles = async (
  fileNames: PlatformSpecificFileDefinition[]
): Promise<PlatformSpecificFileDeclarationReflection[]> => Promise.all(fileNames.map(getTypesFromPlatformSpecificUpscalerFile));
