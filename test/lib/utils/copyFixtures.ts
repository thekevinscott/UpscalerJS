import fs from 'fs';
import { copySync, mkdirp, mkdirpSync } from 'fs-extra';
import path from 'path';
import { getAllAvailableModelPackages } from '../../../scripts/package-scripts/utils/getAllAvailableModels';

const ROOT = path.resolve(__dirname, '../../../');
const MODELS = path.resolve(ROOT, 'models');
const FIXTURES = path.resolve(ROOT, 'test/__fixtures__');
interface CopyFixtureOpts {
  includeFixtures?: boolean;
  includeModels?: boolean;
  verbose?: boolean;
}

export const copyFixtures = (dist: string, { verbose, includeFixtures = true, includeModels = false }: CopyFixtureOpts = {} ) => {
  mkdirpSync(dist);
  if (includeFixtures) {
    if (verbose) {
      console.log('Copying fixtures');
    }
    fs.copyFileSync(path.join(FIXTURES, 'flower-small.png'), path.join(dist, 'flower-small.png'))
  }
  if (includeModels) {
    getAllAvailableModelPackages().map(packageName => {
      if (verbose) {
        console.log(`Copying ${packageName} model as a fixture`);
      }
      const srcDir = path.resolve(MODELS, packageName, 'models');
      const destDir = path.resolve(dist, 'models', packageName, 'models');
      copySync(srcDir, destDir, { overwrite: true });
    });
  }
};
