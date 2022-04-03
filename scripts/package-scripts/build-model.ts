import fs from 'fs';
import rimraf from 'rimraf';
import ts from "typescript";
import path from 'path';
import inquirer from 'inquirer';

type OutputFormat = 'cjs' | 'esm' | 'umd';
const ROOT_DIR = path.resolve(__dirname, '../..');
const MODELS_DIR = path.resolve(ROOT_DIR, 'models');
const AVAILABLE_MODELS = fs.readdirSync(MODELS_DIR).filter(file => {
  return file !== 'node_modules' && fs.lstatSync(path.resolve(MODELS_DIR, file)).isDirectory();
});

const buildCJS = async (modelFolder: string) => {
  console.log('rimraf', path.resolve(modelFolder, 'dist/node'))
  // rimraf()

  // "build:node": "rimraf dist/node && mkdir -p dist/node && yarn scaffold:platform 'node' && yarn build:cjs && mv dist/cjs dist/node/cjs",
  // "build:node-gpu": "rimraf dist/node-gpu && mkdir -p dist/node-gpu && yarn scaffold:platform 'node-gpu' && yarn lerna run build:cjs && mv dist/cjs dist/node-gpu/cjs",
  // "build:cjs": "tsc -p tsconfig.node.json --module commonjs --target es5 --outDir dist/cjs",
}

const buildModel = async (model: string, outputFormats: Array<OutputFormat>) => {
  const start = new Date().getTime();

  const MODEL_ROOT = path.resolve(MODELS_DIR, model);

  console.log(outputFormats)
  if (outputFormats.includes('cjs')) {
    console.log('do it')
    await buildCJS(MODEL_ROOT);
  }
  const duration = new Date().getTime() - start;
  console.log(`Built model ${model} in ${duration} ms`)
  // "build:browser": "rimraf dist/browser && mkdir -p dist/browser && yarn scaffold:platform 'browser' && yarn lerna run build:esm && mv dist/esm dist/browser/esm",
  // "build:esm": "tsc -p tsconfig.browser.json --module esnext --moduleResolution node --target esnext --outDir dist/esm",
  // "build:umd:tsc": "tsc -p tsconfig.browser.json --moduleResolution node --module es2015 --target es5 --outDir dist/tmp",
  // "build:umd:rollup": "yarn rollup -c rollup.config.js --failAfterWarnings",
  // "build:umd:generate": "yarn build:umd:tsc && yarn build:umd:rollup",
  // "build:umd:compress": "uglifyjs --source-map --comments --output dist/browser/umd/esrgan.min.js -- dist/browser/umd/esrgan.js",
  // "build:umd": "yarn build:umd:generate && yarn build:umd:compress && rimraf dist/tmp",
  // "scaffold:platform": "ts-node ../../scripts/package-scripts/scaffold-platform.ts --src models/esrgan/src"
}

const buildModels = async (models: Array<string>, outputFormats: Array<OutputFormat>) => {
  await Promise.all(models.map(model => buildModel(model, outputFormats)))
}

export default buildModels;

type Answers = { models: Array<string> }

if (require.main === module) {
  (async () => {

  const { models } = await inquirer.prompt<Answers>([
    {
      type: 'checkbox',
      name: 'models',
      message: 'Which models do you want to build?',
      choices: AVAILABLE_MODELS,
    },
  ]);
  if (models.length === 0) {
    console.log('No models selected, nothing to do.')
    return;
  }

  await buildModels(models, ['cjs']);

  })();
}
