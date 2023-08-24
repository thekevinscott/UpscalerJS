import { exists } from "@internals/common/fs";
import { verbose } from "@internals/common/logger";
import { RegistryPackage } from "@internals/registry";
import path from "path";
import { rimraf } from "rimraf";

/**
 * Removes packages from the node_modules directory
 * 
 * Since versions don't change, npm won't rewrite over the installed local packages
 * so we need to remove them before installing the new ones
 */
export const removePackages = async (nodeModulesDir: string, _packages: Promise<RegistryPackage[]>) => {
  await Promise.all((await _packages).map(async ({ name }) => {
    const pathToPackage = path.resolve(nodeModulesDir, name);
    await rimraf(pathToPackage);
    if (await exists(pathToPackage)) {
      throw new Error(`Package was not deleted, the folder ${pathToPackage} still exists on disk`)
    }
    verbose(`Removed ${pathToPackage}`);
  }));
};

