import { Command } from "commander";
import fsExtra from 'fs-extra';
import * as path from 'path';
import type { Tensor } from '@tensorflow/tfjs-node';
import { getModel, getUpscaler, isValidTFJSLibrary } from '../utils/upscaler.js';
import { MODELS_DIR } from "@internals/common/constants";
import { ALL_MODELS as _ALL_MODELS } from '@internals/common/models';
const { readFileSync, mkdirpSync, writeFileSync, existsSync, } = fsExtra;

const ALL_MODELS = _ALL_MODELS.then(results => {
  return results.filter(result => {
    return result.packageDirectoryName !== 'default-model';
  // }).map(result => {
  //   return path.join(result.packageName, 'src', result.modelName);
  });
});

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
  // model: string[];
  env: string;
  overwrite: boolean;
}) => {
  console.log(opts.overwrite);
  // if (!opts.model || opts.model.length === 0) {
  //   throw new Error('Provide a model')
  // }
  const env = opts.env;
  if (!isValidTFJSLibrary(env)) {
    throw new Error(`Invalid env provided: ${env}`);
  }
  const tf = require(`@tensorflow/tfjs-${env}`);
  const Upscaler = await getUpscaler(env);
  for (const { packageDirectoryName, modelName, } of await ALL_MODELS) {
    const model = await getModel(tf, packageDirectoryName, modelName);
    const upscaler = new Upscaler({
      model,
    });
    const imagePath = path.resolve(MODELS_DIR, modelName, 'test/__fixtures__/fixture.png');
    const outputPath = path.resolve(MODELS_DIR, modelName, 'test/__fixtures__', modelName, 'result.png');
    if (!existsSync(outputPath) || opts.overwrite) {
      mkdirpSync(path.dirname(outputPath));
      const image = getImage(tf, imagePath);
      const shape = image.shape;
      const [upscaledTensor, duration] = await upscaleImage(tf, upscaler, image);
      console.log(`Duration for ${imagePath}: ${duration}s`);
      image.dispose();
      let expectedScale: undefined | number = undefined;
      if (modelName.includes('2x')) { expectedScale = 2; }
      if (modelName.includes('3x')) { expectedScale = 3; }
      if (modelName.includes('4x')) { expectedScale = 4; }
      if (modelName.includes('8x')) { expectedScale = 8; }
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

export const registerScript = async (program: Command) => {
  const allModels = await ALL_MODELS;
  program.command('write-model-test-fixtures')
    .description('Write test fixtures out for models')
    // .option('-m, --model <string...>', 'model to use', allModels)
    .option('-e, --env <string>', 'environment', DEFAULT_UPSCALER_ENV)
    .option('-o, --overwrite', 'whether to overwrite the images', false)
    .action(main);
}
