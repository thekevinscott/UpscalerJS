import { Command } from "commander";
import { readFileSync, mkdirpSync, writeFileSync, } from 'fs-extra';
import * as path from 'path';
import type { Tensor } from '@tensorflow/tfjs-node';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../../../../scripts/package-scripts/utils/getAllAvailableModels';
import { getModel, getUpscaler, isValidEnv, ValidEnv } from '../utils/upscaler';
import { MODELS_DIR, TMP_DIR } from "../utils/constants";

const USE_RANDOM_SLICE = false;

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

const getImage = (tf: any, imagePath: string) => tf.tidy(() => {
  const imageBuffer = readFileSync(imagePath);
  const tensor = tf.node.decodeImage(imageBuffer).slice([0, 0, 0], [-1, -1, 3]);

  if (USE_RANDOM_SLICE) {
    // take a random slice!
    const shape = tensor.shape;
    const height = Math.round(Math.random() * (shape[0] - 1)) + 1;
    const width = Math.round(Math.random() * (shape[1] - 1)) + 1;
    console.log(height, width)
    const slicedImage = tensor.slice([height, width, 0], [-1, -1, -1]);
    const slicedShape = slicedImage.shape;
    const slicedHeight = Math.round(Math.random() * slicedShape[0]);
    const slicedWidth = Math.round(Math.random() * slicedShape[1]);
    console.log(slicedHeight, slicedWidth)
    return slicedImage.slice([0, 0, 0], [slicedHeight, slicedWidth, -1]);
  }
  return tensor;
});

const upscaleImage = async (tf: any, upscaler: any, image: Tensor, patchSize?: number, padding?: number) => {
  const start = performance.now();
  process.stdout.write("\n");
  const upscaledTensor = await upscaler.upscale(image, {
    patchSize,
    padding,
    progress: (rate) => {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`${rate}`);
    },
  });
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  const duration = ((performance.now() - start) / 1000).toFixed(2);
  return [upscaledTensor, duration];
}

const main = async (opts: {
  model: string[];
  env: string[];
  // outputDirectory: string;
  patchSize: number[];
  padding: number[];
}) => {
  // console.warn = () => {};
  if (!opts.model || opts.model.length === 0) {
    throw new Error('Provide a model')
  }
  if (!opts.env || opts.env.length === 0) {
    throw new Error('Provide an environment')
  }
  for (const env of opts.env) {
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
      for (const patchSize of (opts.patchSize?.length ? opts.patchSize : [undefined])) {
        for (const padding of (opts.padding?.length ? opts.padding : [undefined])) {
          const modelName = modelPath.split('/').shift();
          if (!modelName) {
            throw new Error(`Bad model path: ${modelPath}`);
          }
          const imagePath = path.resolve(MODELS_DIR, modelName, 'assets/fixture.png');
          const outputPath = path.resolve(...[
            TMP_DIR,
            'dev',
            'node',
            'test-model',
            modelPath,
            env,
            [
              patchSize,
              padding,
            ].map(part => part || 'none').map(part => `${part}`).join('-'),
            'output.png',
          ]);
          mkdirpSync(path.dirname(outputPath));


          const image = getImage(tf, imagePath);

          const shape = image.shape;
          console.log('Running', modelPath, 'and image of size', shape)
          const [upscaledTensor, duration, output] = await upscaleImage(tf, upscaler, image, patchSize, padding);
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
          console.log(`Wrote image to ${outputPath}`)
        }
      }
    }
  }
}

const parseInts = (value: string, previous: number[] = []): number[] => previous.concat(parseInt(value, 10));

export const registerScript = (program: Command) => {
  program.command('test-model')
    .description('Test a model.')
    .option('-m, --model <string...>', 'model to use', ALL_MODELS)
    .option('-e, --env <string...>', 'environment', [DEFAULT_UPSCALER_ENV])
    .option('-p, --patch-size <number...>', 'patch size', parseInts)
    .option('-a, --padding <number...>', 'padding', parseInts)
    // .option('-o, --output-directory <string>', 'output directory')
    .action(main);
}
