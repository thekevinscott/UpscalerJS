import { getPackageAsTree } from "./get-package-as-tree.js";
import { DeclarationReflection } from "typedoc";
import path from "path";

export interface ProjectDefinition {
  tsconfigPath: string;
  projectRoot: string;
}

export const getDeclarationReflectionsFromPackages = async (projectDefinitions: ProjectDefinition[]): Promise<DeclarationReflection[]> => {
  const declarationReflections: DeclarationReflection[] = [];
  for (const { tsconfigPath, projectRoot } of projectDefinitions) {
    const { children } = await getPackageAsTree(
      path.join(projectRoot, 'src'),
      tsconfigPath,
      projectRoot,
    );
    if (children === undefined || children.length === 0) {
      throw new Error(`No children were found for ${projectRoot}. Indicates an error in the returned structure from getPackageAsTree`);
    }
    declarationReflections.push(...children);
  }
  return declarationReflections;
};
