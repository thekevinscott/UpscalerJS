import yargs from 'yargs';
import path from 'path';
import { copySync, cp, cpSync, mkdirp, readFileSync, writeFile } from 'fs-extra';
import { getString } from './prompt/getString';
import { MODELS_DIR, ROOT_DIR } from './utils/constants';
import execute from './utils/execute';

/****
 * Type Definitions
 */

/****
 * Constants
 */

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

const BASE_TS_CONFIG = {
  "extends": "../tsconfig.cjs.json",
  "include": [
    "src/**/*.ts"
  ],
};

const TS_CONFIG_CJS = {
  ...BASE_TS_CONFIG,
  "compilerOptions": {
    "rootDir": "./src",
    "baseUrl": "./src",
    "outDir": "./dist/cjs",
  },
};

const TS_CONFIG_ESM = {
  ...BASE_TS_CONFIG,
  "compilerOptions": {
    "rootDir": "./src",
    "baseUrl": "./src",
    "outDir": "./dist/esm",
  },
};

const TS_CONFIG_UMD = {
  ...BASE_TS_CONFIG,
  "compilerOptions": {
    "rootDir": "./src",
    "baseUrl": "./src",
    "outDir": "./dist/tmp",
  },
};

/****
 * Helper functions
 */
const writeModelFile = async (name: string, data: string) => {
  await mkdirp(path.dirname(name));
  await writeFile(name, data.trim());
}

const createNpmIgnore = (): string => [
  'assets',
  'src',
  'yarn-error.log',
  'node_modules',
  'test',
  'demo',
  'DOC.mdx',
  'models.dvc',
].join('\n');

const createGitIgnore = () => [
  'dist',
  'node_modules',
  '*.generated.ts',
].join('\n');

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
    "@tensorflow/tfjs": getTensorflowVersion(),
  },
  "dependencies": {
    "@upscalerjs/core": "workspace:*"
  },
  "devDependencies": {
    "@tensorflow/tfjs-core": getTensorflowVersion(),
    "@tensorflow/tfjs-layers": getTensorflowVersion(),
    "@tensorflow/tfjs": getTensorflowVersion(),
    "@tensorflow/tfjs-node": getTensorflowVersion(),
    "@tensorflow/tfjs-node-gpu": getTensorflowVersion(),
    "seedrandom": "3.0.5"
  },
  "author": "Kevin Scott",
  "license": "MIT"
}, null, 2);

const getTensorflowVersion = () => {
  const { peerDependencies } = JSON.parse(readFileSync(path.resolve(ROOT_DIR, 'package.json'), 'utf-8'));
  return peerDependencies['@tensorflow/tfjs'];
}

const createNewUMDNames = (name?: string) => JSON.stringify(name ? {
  ".": name,
} : {}, null, 2);

const createClipOutput = () => `
import type { Tensor, Tensor4D, } from '@tensorflow/tfjs-core';
import { PostProcess, TF, } from '@upscalerjs/core';

export const clipOutput = (tf: TF): PostProcess => (output: Tensor) => tf.tidy<Tensor4D>(() => {
  const clippedValue = output.clipByValue(0, 255);
  output.dispose();
  return clippedValue as Tensor4D;
});
`.trim();

const createGetModelDefinition = () => `
import type { Tensor, Tensor4D, } from '@tensorflow/tfjs-core';
import { ModelDefinition, ModelDefinitionFn, } from '@upscalerjs/core';
import { NAME, VERSION, } from '../constants.generated';
import { clipOutput, } from './clipOutput';

type Size = 'rdn' | 'rrdn';

const getModelDefinition = (scale: 2 | 3 | 4 | 8, architecture: Size, modelPath: string, meta = {}): ModelDefinitionFn => tf => {
  let preprocess: ModelDefinition['preprocess'];
  let postprocess: ModelDefinition['postprocess'] = clipOutput(tf);
  if (architecture === 'rrdn') {
    const Layer = tf.layers.Layer;
    const BETA = 0.2;

    type Inputs = Tensor4D | Tensor4D[];

    const isTensorArray = (inputs: Inputs): inputs is Tensor4D[] => {
      return Array.isArray(inputs);
    };

    const getInput = (inputs: Inputs): Tensor4D => {
      if (isTensorArray(inputs)) {
        return inputs[0];
      }
      return inputs;
    };
    class MultiplyBeta extends Layer {
      beta: number;

      constructor() {
        super({});
        this.beta = BETA;
      }

      call(inputs: Inputs) {
        return tf.mul(getInput(inputs), this.beta);
      }

      static className = 'MultiplyBeta';
    }

    class PixelShuffle extends Layer {
      scale: number;

      constructor() {
        super({});
        this.scale = scale;
      }

      computeOutputShape(inputShape: number[]) {
        return [inputShape[0], inputShape[1], inputShape[2], 3,];
      }

      call(inputs: Inputs) {
        return tf.depthToSpace(getInput(inputs), this.scale, 'NHWC');
      }

      static className = 'PixelShuffle';
    }

    [MultiplyBeta, PixelShuffle,].forEach((layer) => {
      tf.serialization.registerClass(layer);
    });

    preprocess = (image: Tensor) => tf.mul(image, 1 / 255);
    postprocess = (output: Tensor) => tf.tidy(() => {
      const clippedValue = (output).clipByValue(0, 1);
      output.dispose();
      return tf.mul(clippedValue, 255);
    });
  }

  return {
    scale,
    channels: 3,
    _internals: {
      path: modelPath,
      name: NAME,
      version: VERSION,
    },
    meta,
    preprocess,
    postprocess,
  };
};

export default getModelDefinition;

`.trim();

const createIndexFile = (modelName: string) => `
import { ModelDefinitionFn, } from '@upscalerjs/core';
import { NAME, VERSION, } from './constants.generated';
// import type { Tensor, Tensor4D, } from '@tensorflow/tfjs-core';
// import { PostProcess, TF, } from '@upscalerjs/core';

const SCALE = 2;

// const modelDefinition: ModelDefinitionFn = tf => ({
const modelDefinition: ModelDefinitionFn = () => ({
  scale: SCALE,
  channels: 3,
  _internals: {
    path: 'models/${modelName}/model.json',
    name: NAME,
    version: VERSION,
  },
  meta: {
  },
});

export default modelDefinition;
`;

const getFilesToCreate = (name: string, description: string, UMDName?: string, modelFolder = ''): [string, string][] => {
  const filesToCreate: [string, string][] = [
    ['LICENSE', createLicense()],
    ['.npmignore', createNpmIgnore()],
    ['.gitignore', createGitIgnore()],
    ['package.json', createPackageJSON(name, description)],
    ['tsconfig.cjs.json', JSON.stringify(TS_CONFIG_CJS, null, 2)],
    ['tsconfig.esm.json', JSON.stringify(TS_CONFIG_ESM, null, 2)],
    ['tsconfig.umd.json', JSON.stringify(TS_CONFIG_UMD, null, 2)],
    ['tsconfig.json', JSON.stringify(TS_CONFIG, null, 2)],
    ['umd-names.json', createNewUMDNames(UMDName)],
    // ['src/utils/clipOutput.ts', createClipOutput()],
    // ['src/utils/getModelDefinition.ts', createGetModelDefinition()],
  ];

  if (modelFolder) {
    filesToCreate.push(['src/index.ts', createIndexFile(modelFolder)]);
  }
  return filesToCreate;
};

/****
 * Main function
 */
const createNewModelFolder = async (name: string, description: string, UMDName?: string, modelFolder = ''): Promise<void> => {
  const base = path.resolve(MODELS_DIR, name);
  await mkdirp(base);
  await Promise.all([
    mkdirp(path.resolve(base, 'models')),
    mkdirp(path.resolve(base, 'src')),
  ]);
  let modelFolderName = modelFolder.split('/').pop();
  if (modelFolderName) {
    const targetFolder = path.resolve(base, 'models', modelFolderName);
    copySync(modelFolder, targetFolder, { overwrite: false });
  }
  await Promise.all(getFilesToCreate(name, description, UMDName, modelFolderName).map(([name, data]) => writeModelFile(path.resolve(base, name), data)));
  await execute('pnpm install', { cwd: base });
  await execute('pnpm build', { cwd: base });
};

export default createNewModelFolder;

/****
 * Functions to expose the main function as a CLI tool
 */

type Answers = { name: string; description: string; UMDName: string; modelFolder: string }

const getArgs = async (): Promise<Answers> => {
  const argv = await yargs.command('create new model folder', 'create folder', yargs => {
    yargs.positional('model', {
      describe: 'The model folder to create',
    }).options({
      description: { type: 'string' },
      umdName: { type: 'string' },
      modelFolder: { type: 'string' },
    });
  })
    .help()
    .argv;

  const name = await getString('What is the name of the model folder you wish to create?', argv._[0]);
  const description = await getString('What is the description of the model', argv.description);
  const UMDName = await getString('What do you want to use for the UMD name', argv.umdName);
  const modelFolder = (await getString('Do you wish to copy a model folder in? If so, provide its path', argv.modelFolder)).trim();

  return {
    name,
    description,
    UMDName,
    modelFolder,
  }
}

if (require.main === module) {
  (async () => {
    const { name, description, UMDName, modelFolder } = await getArgs();
    await createNewModelFolder(name, description, UMDName, modelFolder);
  })();
}
