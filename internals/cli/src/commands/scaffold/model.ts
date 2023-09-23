import {Args, Flags} from '@oclif/core';
import path from 'path';
import { writeFile } from '@internals/common/fs';
import { validateModels } from '../../lib/commands/validate-models.js';
import { MODELS_DIR, ROOT_DIR } from '@internals/common/constants';
import { getPackageJSON } from '@internals/common/package-json';
import { collectVariadicArgs } from '../../lib/utils/collect-variadic-args.js';
import { BaseCommand } from '../../lib/utils/base-command.js';

export const scaffoldModel = async (modelPackageDirectoryName: string) => {
  const MODEL_ROOT = path.resolve(MODELS_DIR, modelPackageDirectoryName);
  const packageRoot = MODEL_ROOT;
  const PACKAGE_ROOT = path.resolve(ROOT_DIR, packageRoot);
  const PACKAGE_SRC = path.resolve(PACKAGE_ROOT, 'src');
  const { name, version } = await getPackageJSON(PACKAGE_ROOT);
  const filePath = path.resolve(PACKAGE_SRC, 'constants.generated.ts');
  writeFile(filePath, [
    `export const NAME = "${name}";`,
    `export const VERSION = "${version}";`,
  ].join('\n'));
}

export const scaffoldModels = async (modelPackageDirectoryNames: string[]) => {
  await Promise.all(modelPackageDirectoryNames.map(scaffoldModel));
};

export default class ScaffoldModel extends BaseCommand<typeof ScaffoldModel> {
  static description = 'Scaffold a model'

  static flags = {
    validateModelsFolder: Flags.boolean({char: 'v', description: 'Whether to validate the existence of the models folder', default: false}),
  }

  static strict = false;

  static args = {
    models: Args.string({description: 'The model package to build. Must be a valid model in the /models folder', required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(ScaffoldModel);
    const _models = collectVariadicArgs(this.argv);
    const models = await validateModels(_models, { validateModelsFolder: flags.validateModelsFolder, });
    return scaffoldModels(await validateModels(models));
  }
}
