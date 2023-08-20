import { program } from 'commander';
import path from 'path';
import fsExtra from 'fs-extra';
import { ROOT_DIR } from './lib/package-scripts/utils/constants.js';
import { buildCommandsTree } from './lib/cli/build-commands-tree.js';
const { readFileSync, readdir, stat, } = fsExtra;

  // "scripts": {
  //   "build:upscaler": "pnpm __run_command ./package-scripts/build-upscaler.ts",
  //   "build:core": "pnpm __run_command ./package-scripts/build-core.ts",
  //   "docs:build-api": "pnpm __run_command ./package-scripts/docs/build-api.ts",
  //   "docs:build-guides": "pnpm __run_command ./package-scripts/docs/build-guides.ts",
  //   "docs:link-model-readmes": "pnpm __run_command ./package-scripts/docs/link-model-readmes.ts",
  //   "docs:tense-checks": "pnpm __run_command ./package-scripts/docs/tense-checks.ts",
  //   "model:benchmark:performance": "pnpm __run_command ./package-scripts/benchmark/performance/index.ts",
  //   "find-all-packages": "pnpm __run_command ./package-scripts/find-all-packages.ts",
  //   "model:benchmark:speed": "pnpm __run_command ./package-scripts/benchmark/speed/index.ts",
  //   "model:build": "pnpm __run_command ./package-scripts/build-model.ts",
  //   "model:clean": "pnpm __run_command ./package-scripts/clean-model.ts",
  //   "model:convert-python-model": "pnpm __run_command ./package-scripts/convert-python-model.ts",
  //   "model:convert-python-model-folder": "pnpm __run_command ./package-scripts/convert-python-model-folder.ts",
  //   "model:create": "pnpm __run_command ./package-scripts/create-new-model-folder.ts",
  //   "model:demo:create": "pnpm __run_command ./package-scripts/create-model-demo.ts",
  //   "model:write-docs": "pnpm __run_command ./package-scripts/write-model-docs.ts",
  //   "test:integration:browserstack": "pnpm __run_command ./test.ts --kind integration --platform browser --runner browserstack",
  //   "test:integration:browser": "pnpm __run_command ./test.ts --kind integration --platform browser",
  //   "test:integration:node": "pnpm __run_command ./test.ts --kind integration --platform node",
  //   "test:memory-leaks": "pnpm __run_command ./test.ts --kind memory --platform browser",
  //   "test:model": "pnpm __run_command ./test.ts --kind model",
  //   "update:version": "pnpm __run_command ./package-scripts/update-version.ts",
  //   "update:tfjs": "pnpm __run_command ./package-scripts/update-tfjs.ts",
  //   "update:dependency": "pnpm __run_command ./package-scripts/update-dependency.ts",
  //   "update:npm:dependencies": "pnpm __run_command ./package-scripts/update-npm-dependencies.ts",
  //   "validate:build": "pnpm __run_command ./package-scripts/validate-build.ts"
  // },

const getName = (fullPath: string): string => {
  const parts = fullPath.split('/');
  const file = parts.pop();
  if (!file) {
    throw new Error(`Bad full path provided: ${fullPath}`);
  }
  const name = file.split('.').slice(0, -1).join('.');
  if (name === 'index') {
    const dir = parts.pop();
    if (!dir) {
      throw new Error(`Bad full path provided, could not get dir: ${fullPath}`);
    }
    return dir;
  }
  return name;
};


export class CLI {
  constructor() {
    const packageJSON = new URL('../package.json', import.meta.url);
    const { name, description, version } = JSON.parse(readFileSync(packageJSON, 'utf-8'));

    program
      .name(name)
      .description(description)
      .version(version);
  }

  run = async () => {
    const srcDir = path.resolve(ROOT_DIR, './internals/upscaler-cli/src/commands');
    const root = await buildCommandsTree(srcDir);
    await root.registerProgram(program);
    return program.parseAsync();
  };
}
