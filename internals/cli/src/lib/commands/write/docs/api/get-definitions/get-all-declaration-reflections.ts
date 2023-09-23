import { CORE_DIR, UPSCALER_DIR } from "@internals/common/constants";
import { CORE_TSCONFIG_PATH, UPSCALER_TSCONFIG_PATH } from "../constants.js";
import { DeclarationReflection } from "typedoc";
import { getDeclarationReflectionsFromPackages } from "./get-declaration-reflections-from-packages.js";
import { getTypesFromPlatformSpecificUpscalerFiles } from "./get-types-from-platform-specific-upscaler-files.js";
import { PlatformSpecificFileDeclarationReflection } from "../types.js";

const DECLARATION_REFLECTION_FILE_DEFINITIONS = [{
  tsconfigPath: UPSCALER_TSCONFIG_PATH,
  projectRoot: UPSCALER_DIR,
}, {
  tsconfigPath: CORE_TSCONFIG_PATH,
  projectRoot: CORE_DIR,
}];

export const getAllDeclarationReflections = async (): Promise<(DeclarationReflection | PlatformSpecificFileDeclarationReflection)[]> => ([
  ...(await getTypesFromPlatformSpecificUpscalerFiles([{ fileName: 'image', typeName: 'Input' }])),
  ...getDeclarationReflectionsFromPackages(DECLARATION_REFLECTION_FILE_DEFINITIONS),
]);
