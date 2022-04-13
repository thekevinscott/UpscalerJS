import fs from 'fs-extra';
import rimraf from 'rimraf';
import ts, { ProjectReference } from "typescript";
import path from 'path';
import inquirer from 'inquirer';
import scaffoldPlatform, { Platform } from './scaffold-platform';
import { compile } from './utils/compile';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { rollupBuild } from './utils/rollup';
import { uglify } from './utils/uglify';
import yargs from 'yargs';
export type OutputFormat = 'cjs' | 'esm' | 'umd';
const ROOT_DIR = path.resolve(__dirname, '../..');
const MODELS_DIR = path.resolve(ROOT_DIR, 'models');
export const AVAILABLE_MODELS = fs.readdirSync(MODELS_DIR).filter(file => {
  return !['dist', 'types', 'node_modules'].includes(file) && fs.lstatSync(path.resolve(MODELS_DIR, file)).isDirectory();
});
const DEFAULT_OUTPUT_FORMATS: Array<OutputFormat> = ['cjs', 'esm', 'umd'];

const references: ProjectReference[] = [{
  path: path.resolve(ROOT_DIR, 'packages/upscalerjs/src'),
}];
const TSCONFIG: ts.CompilerOptions = {
  "skipLibCheck": true,
  "esModuleInterop": true,
  "target": ts.ScriptTarget.ES2020,
  "module": ts.ModuleKind.CommonJS,
  "declaration": true,
  "strict": true,
  "forceConsistentCasingInFileNames": true,
  "noUnusedLocals": true,
  "strictNullChecks": true,
  "noUnusedParameters": true,
  "composite": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "paths": {
    "~upscaler": [path.resolve(ROOT_DIR, 'packages/upscalerjs/src/types')],
  },
  // "composite": true,
  // baseUrl: ROOT_DIR,
  // "paths": {
  //   "upscaler": [path.resolve(ROOT_DIR, 'packages/upscalerjs/src/types')],
  // },
  // "references": [      // this is how we declare a dependency from
  //   { "upscaler": path.resolve(ROOT_DIR, 'packages/upscalerjs/src/types'), }
  // ],
  // rootDir: SRC,
  references,
};

const rm = (folder: string) => new Promise((resolve, reject) => {
  rimraf(folder, err => {
    if (err) {
      reject(err);
    } else {
      resolve();
    }
  })
});

const getExportFiles = (modelFolder: string): Array<string> => {
  const SRC = path.resolve(modelFolder, 'src');
  const { exports } = JSON.parse(fs.readFileSync(path.resolve(modelFolder, 'package.json'), 'utf8'));
  return Object.keys(exports).filter(file => file !== '.').map(file => path.resolve(SRC, file));
};

const buildESM = async (modelFolder: string) => {
  const SRC = path.resolve(modelFolder, 'src');
  const DIST = path.resolve(modelFolder, 'dist/browser/esm');
  const files = getExportFiles(modelFolder);

  await compile(files, {
    ...TSCONFIG,
    // "target": ts.ScriptTarget.ESNext,
    // "module": ts.ModuleKind.ESNext,
    // moduleResolution: ts.ModuleResolutionKind.NodeJs,
    // "declaration": true,
    // "skipLibCheck": true,
    // "strict": true,
    // "forceConsistentCasingInFileNames": true,
    // "noUnusedLocals": true,
    // "esModuleInterop": true,
    // "strictNullChecks": true,
    // "noUnusedParameters": true,
    // "noImplicitReturns": true,
    // "noFallthroughCasesInSwitch": true,
    // baseUrl: ROOT_DIR,
    // rootDir: SRC,
    outDir: DIST,
  });
}

const buildUMD = async (modelFolder: string) => {
  const SRC = path.resolve(modelFolder, 'src');
  const TMP = path.resolve(modelFolder, 'dist/tmp');
  const DIST = path.resolve(modelFolder, 'dist/browser/umd');
  // await rm(DIST);
  fs.mkdirSync(DIST);
  const files = getExportFiles(modelFolder);

  await compile(files, {
    ...TSCONFIG,
    // "target": ts.ScriptTarget.ES5,
    // "module": ts.ModuleKind.ES2015,
    // "moduleResolution": ts.ModuleResolutionKind.NodeJs,
    // "declaration": true,
    // "skipLibCheck": true,
    // "strict": true,
    // "forceConsistentCasingInFileNames": true,
    // "noUnusedLocals": true,
    // "esModuleInterop": true,
    // "strictNullChecks": true,
    // "noUnusedParameters": true,
    // "noImplicitReturns": true,
    // "noFallthroughCasesInSwitch": true,
    // rootDir: SRC,
    outDir: TMP,
  });

  for (let i = 0; i < files.length; i++) {
    const file = `${path.basename(files[i])}.js`;
      const input = path.resolve(TMP, file);
    console.log('file', input);
    await rollupBuild({
      input,
      context: 'window',
      external: ['@tensorflow/tfjs'],
      plugins: [
        nodeResolve({
          preferBuiltins: true,
          resolveOnly: [
            /^(?!.*(@tensorflow\/tfjs))/,
          ],
        }),
        commonjs(),
      ]
    }, [{
      file,
      format: 'umd',
      name: 'Model',
      globals: {
        '@tensorflow/tfjs': 'tf',
      }
    }], DIST)

    uglify(DIST, file);
  }
  await rm(TMP);
}

const buildCJS = async (modelFolder: string) => {
  const SRC = path.resolve(modelFolder, 'src');
  const files = getExportFiles(modelFolder);

  const platforms: Array<{
    platform: Platform;
    dist: string;
  }> = [{
    platform: 'node',
    dist: path.resolve(modelFolder, 'dist/node'),
  }, {
    platform: 'node-gpu',
    dist: path.resolve(modelFolder, 'dist/node-gpu'),
  }];
  for (let i = 0; i < platforms.length; i++) {
    const { platform, dist } = platforms[i];
    fs.mkdirSync(dist);

    await scaffoldPlatform(platform, SRC);

    // const foo: MapLike<string[]> = [['foo', 'bar']];
    // const bar: MapLike<string[]> = { test: ['foo'] };

    await compile(files, {
    ...TSCONFIG,
      // "skipLibCheck": true,
      // "esModuleInterop": true,
      // "target": ts.ScriptTarget.ES2020,
      // "module": ts.ModuleKind.CommonJS,
      // "declaration": true,
      // "strict": true,
      // "forceConsistentCasingInFileNames": true,
      // "noUnusedLocals": true,
      // "strictNullChecks": true,
      // "noUnusedParameters": true,
      // "noImplicitReturns": true,
      // "noFallthroughCasesInSwitch": true,
      // baseUrl: ROOT_DIR,
      // "paths": {
      //   "upscaler": [path.resolve(ROOT_DIR, 'packages/upscalerjs/src/types')],
      // },
      baseUrl: SRC,
      rootDir: SRC,
      outDir: dist,
    });
  }
};

const buildModel = async (model: string, outputFormats: Array<OutputFormat>) => {
  const start = new Date().getTime();

  const MODEL_ROOT = path.resolve(MODELS_DIR, model);
  const DIST = path.resolve(MODEL_ROOT, 'dist')

  await rm(DIST);
  fs.mkdirSync(DIST);
  if (outputFormats.includes('cjs')) {
    await buildCJS(MODEL_ROOT);
  }
  if (outputFormats.includes('esm') || outputFormats.includes('umd')) {
    const SRC = path.resolve(MODEL_ROOT, 'src');
    fs.mkdirSync(path.resolve(DIST, 'browser'));
    await scaffoldPlatform('browser', SRC);

    if (outputFormats.includes('esm')) {
      await buildESM(MODEL_ROOT);
    }

    if (outputFormats.includes('umd')) {
      await buildUMD(MODEL_ROOT);
    }
  }
  // fs.copySync(path.resolve(MODEL_ROOT, 'models'), path.resolve(DIST, 'models'));

  const duration = new Date().getTime() - start;
  console.log(`Built model ${model} in ${duration} ms`)
}

const buildModels = async (models: Array<string> = AVAILABLE_MODELS, outputFormats: Array<OutputFormat> = DEFAULT_OUTPUT_FORMATS) => {
  await Promise.all(models.map(model => buildModel(model, outputFormats)))
}

export default buildModels;

const getModel = async (model?: string | number) => {
  if (typeof model == 'string') {
    return [model];
  }

  const { models } = await inquirer.prompt<Answers>([
    {
      type: 'checkbox',
      name: 'models',
      message: 'Which models do you want to build?',
      choices: AVAILABLE_MODELS,
    },
  ]);
  return models;
}

const isValidOutputFormat = (outputFormat: string): outputFormat is OutputFormat => {
  for (let i = 0; i < DEFAULT_OUTPUT_FORMATS.length; i++) {
    const f = DEFAULT_OUTPUT_FORMATS[i];
    if (f === outputFormat) {
      return true;
    }
  }
  return false;
}
const getOutputFormats = async (outputFormat?: unknown) => {
  if (typeof outputFormat === 'string' && isValidOutputFormat(outputFormat)) {
    return [outputFormat]
  }
  const { outputFormats } = await inquirer.prompt<Answers>([
    {
      type: 'checkbox',
      name: 'outputFormats',
      message: 'Which output formats do you want to build?',
      choices: ['cjs', 'esm', 'umd'],
    },
  ]);
  return outputFormats;
}

type Answers = { models: Array<string>, outputFormats: Array<OutputFormat> }

if (require.main === module) {
  (async () => {
    const argv = await yargs.command('build models', 'build models', yargs => {
      yargs.positional('model', {
        describe: 'The model to build',
      }).options({
        outputFormat: { type: 'string' },
      });
    })
    .help()
    .argv;

    const models = await getModel(argv._[0]);
    const outputFormats = await getOutputFormats(argv.outputFormat);
    let outputFormat = argv.outputFormat;

    if (models?.length === 0) {
      console.log('No models selected, nothing to do.')
      return;
    }

    if (outputFormats?.length === 0) {
      console.log('No output formats selected, nothing to do.')
      return;
    }

    await buildModels(models, outputFormats);
  })();
}
