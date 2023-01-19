import { copySync, mkdirpSync } from 'fs-extra';
import path from 'path';
import { MODELS_DIR } from '../../../scripts/package-scripts/utils/constants';
import { getAllAvailableModelPackages } from '../../../scripts/package-scripts/utils/getAllAvailableModels';

interface CopyFixtureOpts {
  includeFixtures?: boolean;
  includeModels?: boolean;
  verbose?: boolean;
}

export const copyFixtures = (dist: string, { verbose, includeFixtures = true, includeModels = false }: CopyFixtureOpts = {} ) => {
  mkdirpSync(dist);
  if (includeFixtures) {
    getAllAvailableModelPackages().map(packageName => {
      if (verbose) {
        console.log(`Copying ${packageName} model test folder fixtures`);
      }
      const srcDir = path.resolve(MODELS_DIR, packageName, 'test');
      const destDir = path.resolve(dist, 'models', packageName, 'test');
      copySync(srcDir, destDir, { overwrite: true });
    });
  }
  if (includeModels) {
    getAllAvailableModelPackages().map(packageName => {
      if (verbose) {
        console.log(`Copying ${packageName} model as a fixture`);
      }
      const srcDir = path.resolve(MODELS_DIR, packageName, 'models');
      const destDir = path.resolve(dist, 'models', packageName, 'models');
      copySync(srcDir, destDir, { overwrite: true });
    });
  }
};
