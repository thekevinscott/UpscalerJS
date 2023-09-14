import { CORE_DIR, UPSCALER_DIR } from "@internals/common/constants";
import { CORE_SRC_PATH, CORE_TSCONFIG_PATH, UPSCALER_SRC_PATH, UPSCALER_TSCONFIG_PATH } from "../constants.js";
import { getPackageAsTree } from "./get-package-as-tree.js";
import { DeclarationReflection } from "typedoc";
import path from "path";

export interface ProjectDefinition {
  tsconfigPath: string;
  projectRoot: string;
}

  // {
  //   tsconfigPath: UPSCALER_TSCONFIG_PATH,
  //   projectRoot: UPSCALER_DIR,
  // },
  // {
  //   tsconfigPath: CORE_TSCONFIG_PATH,
  //   projectRoot: CORE_DIR,
  // },
export const getDeclarationReflectionsFromPackages = (projectDefinitions: ProjectDefinition[]): DeclarationReflection[] => [
  ...projectDefinitions,
].reduce<DeclarationReflection[]>((arr, { tsconfigPath, projectRoot }) => {
  const tree = getPackageAsTree(
    path.join(projectRoot, 'src'),
    tsconfigPath,
    projectRoot,
  );
  if (!tree.children?.length) {
    throw new Error(`No children were found for ${projectRoot}. Indicates an error in the returned structure from getPackageAsTree`);
  }
  return arr.concat(tree.children);
}, []);
