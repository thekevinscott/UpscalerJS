import { Command } from 'commander';
import { name, version, description } from '../package.json';
import {
  registerScript as registerScriptForTestEsrganInAllConfigurations,
} from './commands/test-esrgan-in-all-configurations';

import {
  registerScript as registerScriptForTestModel,
} from './commands/test-model';

import {
  registerScript as registerScriptForWriteModelTestFixtures,
} from './commands/write-model-test-fixtures';

import {
  registerScript as registerScriptForWriteModelAssets
} from './commands/write-model-assets';

const main = async () => {
  const program = new Command();

  program
    .name(name)
    .description(description)
    .version(version);

  [
    registerScriptForTestModel,
    registerScriptForTestEsrganInAllConfigurations,
    registerScriptForWriteModelTestFixtures,
    registerScriptForWriteModelAssets,
  ].forEach(fn => fn(program));

  await program.parseAsync(process.argv);
};

if (require.main !== module) {
  throw new Error('Run this script directly from the command line.')
}

main();
