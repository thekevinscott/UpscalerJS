import { getPackageAsTree } from "./get-package-as-tree.js";
import { DeclarationReflection } from "typedoc";
import path from "path";

export interface ProjectDefinition {
  tsconfigPath: string;
  projectRoot: string;
}

export const getDeclarationReflectionsFromPackages = (projectDefinitions: ProjectDefinition[]): DeclarationReflection[] => [
  ...projectDefinitions,
].reduce<DeclarationReflection[]>((arr, { tsconfigPath, projectRoot }) => {
  const { children } = getPackageAsTree(
    path.join(projectRoot, 'src'),
    tsconfigPath,
    projectRoot,
  );
  if (children === undefined || children.length === 0) {
    throw new Error(`No children were found for ${projectRoot}. Indicates an error in the returned structure from getPackageAsTree`);
  }
  return arr.concat(children);
}, []);
