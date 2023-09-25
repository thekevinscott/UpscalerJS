import { Command } from "commander";
import { readFileSync, mkdirpSync, writeFileSync, existsSync, } from 'fs-extra';
import * as path from 'path';
import type { Tensor } from '@tensorflow/tfjs-node';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../../../../scripts/package-scripts/utils/getAllAvailableModels.mjs';
import { getModel, getUpscaler, isValidEnv, ValidEnv } from '../utils/upscaler';
import { MODELS_DIR, TMP_DIR } from "../utils/constants";

const ALL_MODELS = getAllAvailableModelPackages().reduce<string[]>((arr, packageName) => {
  if (packageName === 'default-model') {
    return arr;
  }
  const models = getAllAvailableModels(packageName);
  return arr.concat(models.map(model => {
    return path.join(packageName, 'src', model.export);
  }));
}, []);

const DEFAULT_UPSCALER_ENV = 'node';

const getImage = (tf: any, imagePath: string) => {
  const imageBuffer = readFileSync(imagePath);
  const tensor = tf.node.decodeImage(imageBuffer).slice([0, 0, 0], [-1, -1, 3]);
  return tensor;
}

const upscaleImage = async (tf: any, upscaler: any, image: Tensor) => {
  const start = performance.now();
  const upscaledTensor = await upscaler.upscale(image);
  const duration = ((performance.now() - start) / 1000).toFixed(2);
  return [upscaledTensor, duration];
}

const main = async (opts: {
  model: string[];
  env: string;
  overwrite: boolean;
}) => {
  console.log(opts.overwrite);
  if (!opts.model || opts.model.length === 0) {
    throw new Error('Provide a model')
  }
  const env = opts.env;
  if (!isValidEnv(env)) {
    throw new Error(`Invalid env provided: ${env}`);
  }
  const tf = require(`@tensorflow/tfjs-${env}`);
  const Upscaler = getUpscaler(env);
  for (const modelPath of opts.model) {
    const model = getModel(tf, modelPath);
    const upscaler = new Upscaler({
      model,
    });
    const modelParts = modelPath.split('/')
    const modelName = modelParts[0];
    if (!modelName) {
      throw new Error(`Bad model path: ${modelPath}`);
    }
    const imagePath = path.resolve(MODELS_DIR, modelName, 'assets/fixture.png');
    const outputPath = path.resolve(MODELS_DIR, modelName, 'assets', ...modelParts.slice(2).filter(p => p !== 'index'), 'result.png');
    if (!existsSync(outputPath) || opts.overwrite) {
      mkdirpSync(path.dirname(outputPath));
      const image = getImage(tf, imagePath);
      const shape = image.shape;
      const [upscaledTensor, duration] = await upscaleImage(tf, upscaler, image);
      console.log(`Duration for ${imagePath}: ${duration}s`);
      image.dispose();
      let expectedScale: undefined | number = undefined;
      if (modelPath.includes('2x')) { expectedScale = 2; }
      if (modelPath.includes('3x')) { expectedScale = 3; }
      if (modelPath.includes('4x')) { expectedScale = 4; }
      if (modelPath.includes('8x')) { expectedScale = 8; }
      if (expectedScale) {
        if (upscaledTensor.shape[0] !== shape[0] * expectedScale || upscaledTensor.shape[1] !== shape[1] * expectedScale) {
          throw new Error(`Mismatch in expected shape: ${upscaledTensor.shape}, ${shape}`)
        }
      }
      const upscaledPng = await tf.node.encodePng(upscaledTensor);
      upscaledTensor.dispose();
      writeFileSync(outputPath, upscaledPng);
    }
  }
};

export const registerScript = (program: Command) => {
  program.command('write-model-assets')
    .description('Write assets for models')
    .option('-m, --model <string...>', 'model to use', ALL_MODELS)
    .option('-e, --env <string>', 'environment', DEFAULT_UPSCALER_ENV)
    .option('-o, --overwrite', 'whether to overwrite the images', false)
    .action(main);
}
