import { Command } from '@commander-js/extra-typings';
import path from 'path';
import { writeFile } from '@internals/common/fs';
import { validateModels } from '../../lib/commands/validate-models.js';
import { MODELS_DIR, ROOT_DIR } from '@internals/common/constants';
import { getPackageJSON } from '@internals/common/package-json';

export const scaffoldModel = async (modelPackageDirectoryName: string) => {
  const MODEL_ROOT = path.resolve(MODELS_DIR, modelPackageDirectoryName);
  const packageRoot = MODEL_ROOT;
  const PACKAGE_ROOT = path.resolve(ROOT_DIR, packageRoot);
  const PACKAGE_SRC = path.resolve(PACKAGE_ROOT, 'src');
  const { name, version } = await getPackageJSON(PACKAGE_ROOT);
  const filePath = path.resolve(PACKAGE_SRC, `constants.generated.ts`);
  writeFile(filePath, [
    `export const NAME = "${name}";`,
    `export const VERSION = "${version}";`,
  ].join('\n'));
}

export const scaffoldModels = async (modelPackageDirectoryNames: string[]) => {
  await Promise.all(modelPackageDirectoryNames.map(scaffoldModel));
};

export default (program: Command) => program.command('model')
  .description('Scaffold Model')
  .argument('<model...>', 'The model package to build. Must be a valid model in the /models folder')
  .option('-s, --skip-validate-models-folder', 'Whether to validate the existence of the models folder', false)
  .action(async (models, { skipValidateModelsFolder }) => scaffoldModels(await validateModels(models, !skipValidateModelsFolder)));

