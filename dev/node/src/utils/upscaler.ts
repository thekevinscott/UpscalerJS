import * as fs from 'fs-extra';
import * as path from 'path';
import { MODELS_DIR, UPSCALERJS_DIR } from './constants';

export const isValidEnv = (env: string): env is ValidEnv => ['node', 'node-gpu'].includes(env);
export type ValidEnv = 'node' | 'node-gpu';

const checkFile = (filepath: string) => {
  try {
    fs.existsSync(filepath);
  } catch (err) {
    throw new Error(`File ${filepath} does not exist.`);
  }
}

export const getUpscaler = (folder: ValidEnv) => {
  const file = path.resolve(UPSCALERJS_DIR, `dist/${folder}/cjs/index.js`);
  checkFile(file);

  return require(file).default;
}

export const getModel = (tf, modelPath: string) => {
  const fullModelPath = path.resolve(MODELS_DIR, modelPath);
  checkFile(fullModelPath);
  const model = require(fullModelPath).default;
  const { packageInformation, ...rest } = typeof model === 'function' ? model(tf) : model;
  return {
    ...rest,
    path: tf.io.fileSystem(path.resolve(
      MODELS_DIR,
      `${packageInformation?.name.split('/').pop()}/${rest.path}`,
    )),
  };
}
