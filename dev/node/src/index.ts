import { Command } from 'commander';
// import { name, version, description } from '../package.json';
import {
  registerScript as registerScriptForTestEsrganInAllConfigurations,
} from './commands/test-esrgan-in-all-configurations.js';

import {
  registerScript as registerScriptForTestModel,
} from './commands/test-model.js';

import {
  registerScript as registerScriptForWriteModelTestFixtures,
} from './commands/write-model-test-fixtures.js';

import {
  registerScript as registerScriptForWriteModelAssets
} from './commands/write-model-assets.js';

const main = async () => {
  const program = new Command();

  program
    .name("Upscaler Node Testing");
    // .description(description)
    // .version(version);

  await Promise.all([
    registerScriptForTestModel,
    registerScriptForTestEsrganInAllConfigurations,
    registerScriptForWriteModelTestFixtures,
    registerScriptForWriteModelAssets,
  ].map(fn => fn(program)));

  await program.parseAsync(process.argv);
};

main();
