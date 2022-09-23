import yargs from 'yargs';
import path from 'path';
import inquirer from 'inquirer';
import callExec from '../../test/lib/utils/callExec';
import fs, { mkdirp, mkdirpSync } from 'fs-extra';
import { getString } from './prompt/getString';
import { getNumber } from './prompt/getNumber';

/****
 * Type Definitions
 */

/****
 * Constants
 */
const ROOT_DIR = path.resolve(__dirname, '../..');

const DEFAULT_KEYWORDS = [
  "image super resolution",
  "image upscaling",
  "image enhancement",
  "tensorflow.js",
  "pretrained models",
  "esrgan"
];

const TS_CONFIG = {
  "extends": "../tsconfig.json",
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "**/*.test.ts"]
};

const TS_CONFIG_CJS = {
  "extends": "../tsconfig.cjs.json",
  "compilerOptions": {
    "rootDir": "./src",
    "baseUrl": "./src",
    "outDir": "./dist/cjs",
  },
  "include": [
    "./src/index.ts",
  ]
};

const TS_CONFIG_ESM = {
  "extends": "../tsconfig.esm.json",
  "compilerOptions": {
    "rootDir": "./src",
    "baseUrl": "./src",
    "outDir": "./dist/esm",
  },
  "include": [
    "./src/index.ts",
  ]
};

const TS_CONFIG_UMD = {
  "extends": "../tsconfig.esm.json",
  "compilerOptions": {
    "rootDir": "./src",
    "baseUrl": "./src",
    "outDir": "./dist/tmp",
  },
  "include": [
    "./src/index.ts",
  ]
};

/****
 * Helper functions
 */
const writeFile = (name: string, data: string) => fs.writeFile(name, data);

const createLicense = () => `
MIT License

Copyright (c) ${new Date().getFullYear()} Kevin Scott

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

`;

const createPackageJSON = (name: string, description: string, keywords = DEFAULT_KEYWORDS) => JSON.stringify({
  "name": `@upscalerjs/${name}`,
  "version": "0.1.0",
  description,
  "exports": {
    ".": {
      "require": {
        "types": "./dist/cjs/index.d.ts",
        "default": "./dist/cjs/index.js"
      },
      "import": {
        "types": "./dist/esm/index.d.ts",
        "default": "./dist/esm/index.js"
      }
    }
  },
  "scripts": {
    "scaffold:dependencies": `ts-node ../../scripts/package-scripts/scaffold-dependencies.ts --src models/${name} --config models/scaffolder.ts`,
    "lint:fix": "pnpm lint --fix",
    "lint": "pnpm scaffold:dependencies && eslint -c ../.eslintrc.js src --ext .ts",
    "prepublishOnly": "pnpm lint && pnpm build && pnpm validate:build",
    "validate:build": `ts-node ../../scripts/package-scripts/validate-build.ts models/${name}`,
    "build": `ts-node ../../scripts/package-scripts/build-model.ts ${name} -o cjs -o esm -o umd`
  },
  keywords,
  "files": [
    "license",
    "src/**/*",
    "models/**/*",
    "dist/**/*"
  ],
  "peerDependencies": {
    "@tensorflow/tfjs": "^3.19.0"
  },
  "dependencies": {
    "@upscalerjs/core": "workspace:*"
  },
  "devDependencies": {
    "@tensorflow/tfjs-core": "^3.19.0",
    "@tensorflow/tfjs-layers": "^3.19.0",
    "@tensorflow/tfjs": "^3.19.0",
    "@tensorflow/tfjs-node": "^3.19.0",
    "@tensorflow/tfjs-node-gpu": "^3.19.0",
    "seedrandom": "3.0.5"
  },
  "author": "Kevin Scott",
  "license": "MIT"
}, null, 2);

const createNewUMDNames = (name: string) => JSON.stringify({
  ".": name,
}, null, 2);

const createNewSrcIndex = (scale: number) => `
import { ModelDefinition, PostProcess, TF, } from '@upscalerjs/core';
import { NAME, VERSION, } from '../constants.generated';
import type { Tensor, Tensor4D, } from '@tensorflow/tfjs-core';

export const postprocess = (tf: TF): PostProcess => (output: Tensor) => tf.tidy<Tensor4D>(() => {
  const clippedValue = output.clipByValue(0, 255);
  output.dispose();
  return clippedValue as Tensor4D;
});

const modelDefinition: ModelDefinition = {
  scale: ${scale},
  channels: 3,
  path: 'models/model.json',
  packageInformation: {
    name: NAME,
    version: VERSION,
  },
  meta: {
  },
  postprocess,
};

export default modelDefinition;
`.trim();

/****
 * Main function
 */
const createNewModelFolder = async (name: string, description: string, UMDName: string, scale: number): Promise<void> => {
  const base = path.resolve(ROOT_DIR, 'models', name);
  await mkdirp(base);
  await Promise.all([
    mkdirp(path.resolve(base, 'models')),
    mkdirp(path.resolve(base, 'src')),
  ]);
  await Promise.all([
    ['LICENSE', createLicense()],
    ['package.json', createPackageJSON(name, description)],
    ['tsconfig.cjs.json', JSON.stringify(TS_CONFIG_CJS, null, 2)],
    ['tsconfig.esm.json', JSON.stringify(TS_CONFIG_ESM, null, 2)],
    ['tsconfig.umd.json', JSON.stringify(TS_CONFIG_UMD, null, 2)],
    ['tsconfig.json', JSON.stringify(TS_CONFIG, null, 2)],
    ['umd-names.json', createNewUMDNames(UMDName)],
    ['src/index.ts', createNewSrcIndex(scale)]
  ].map(([name, data]) => writeFile(path.resolve(base, name), data)));
};

export default createNewModelFolder;

/****
 * Functions to expose the main function as a CLI tool
 */

type Answers = { name: string; description: string; UMDName: string; scale: number }

const getArgs = async (): Promise<Answers> => {
  const argv = await yargs.command('create new model folder', 'create folder', yargs => {
    yargs.positional('model', {
      describe: 'The model folder to create',
    }).options({
      scale: { type: 'number' },
      description: { type: 'string' },
      umdName: { type: 'string' },
    });
  })
    .help()
    .argv;

  const name = await getString('What is the name of the model folder you wish to create?', argv._[0]);
  const description = await getString('What is the description of the model', argv.description);
  const UMDName = await getString('What do you want to use for the UMD name', argv.umdName);
  const scale = await getNumber('What is the scale of the model', argv.scale);

  return {
    name,
    description,
    UMDName,
    scale,
  }
}

if (require.main === module) {
  (async () => {
    const { name, description, UMDName, scale } = await getArgs();
    createNewModelFolder(name, description, UMDName, scale);
    console.log('** Make sure to cd to your folder, and run "pnpm install && pnpm build"');
  })();
}
