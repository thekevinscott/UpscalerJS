import { Command } from "commander";
import type { Tensor } from '@tensorflow/tfjs-node';
import { getModel, getUpscaler, isValidEnv, ValidEnv } from '../utils/upscaler';

const DEFAULT_MODEL = 'pixel-upsampler/src/x2';
const DEFAULT_SIZE = '32';
const DEFAULT_MIN_SIZE = '4';
const DEFAULT_MIN_PADDING = '2';
const DEFAULT_UPSCALER_ENV = 'node';

const runTest = async (upscaler: any, inputTensor: Tensor, upscaledTensor: Tensor, {
  width,
  height,
  patchSize,
  padding,
}: {
  width: number;
  height: number;
  patchSize: number;
  padding: number;
}) => {

  let upscaledPatchSizeTensor: undefined | Tensor;
  let error;
  try {
    // for (const sliceShape of [
    //   [6,4,3],
    //   [5,4,3],
    //   [4,4,3],
    //   [4,3,3],
    //   [3,3,3],
    //   [2,2,3],
    // ]) {
    //   const t = await upscaler.upscale(inputTensor.slice([0, 0, 0,], sliceShape), {
    //   });
    //   t.mul(255).slice([0, 0, 0], [1, 1, 3]).print();
    // }
    //     throw new Error('stop!')
    upscaledPatchSizeTensor = await upscaler.upscale(inputTensor, {
      patchSize,
      padding,
      // progress: (rate, slice, row, col) => {
      //   const data = slice.dataSync();
      //   console.log(rate, row, col)
      //   slice.slice([0, 0, 0], [1, 1, 3]).print();
      //   slice.dispose();
      //   if (data[0] !== upscaledTensor.dataSync()[0]) {
      //     upscaledTensor.slice([0, 0, 0], [1, 1, 3]).print();
      //     throw new Error('STOP!')
      //   }
      // }
    });
    if (JSON.stringify(upscaledPatchSizeTensor.shape) !== JSON.stringify(upscaledTensor.shape)) {
      throw new Error(`Mismatch between shapes: ${upscaledPatchSizeTensor.shape} ${upscaledTensor.shape}`)
    }
    if (JSON.stringify(upscaledPatchSizeTensor.dataSync()) !== JSON.stringify(upscaledTensor.dataSync())) {
      throw new Error([
        `Mismatch between data:`,
        upscaledTensor.dataSync(),
        upscaledPatchSizeTensor.dataSync(),
      ].join('\n'))
    }
    console.log(`- Good for size ${width}x${height} with patch size ${patchSize} and padding ${padding}`)
  } catch (err) {
    error = {
      width,
      height,
      patchSize,
      padding,
    }
    console.error(`Error for size ${width}x${height} with patch size ${patchSize} and padding ${padding}`)
    console.error(err);
  }
  if (upscaledPatchSizeTensor !== undefined) {
    upscaledPatchSizeTensor.dispose();
  }
  return error;
}

const assessForWidthAndHeight = async (
  tf: any,
  upscaler: any,
  width: number,
  height: number,
  errors: any[],
  minPadding: number,
  patchSize?: number
) => {
  const inputTensor = tf.randomNormal([height, width, 3]);
  const upscaledTensor = await upscaler.upscale(inputTensor);

  if (patchSize) {
    for (let padding = 0; padding <= Math.ceil(patchSize / 2) - 1; padding++) {
      if (padding >= minPadding) {
        const error = await runTest(upscaler, inputTensor, upscaledTensor, {
          width,
          height,
          patchSize,
          padding,
        });
        if (error) {
          errors.push(error)
        }
      }
    }
  } else {
    for (let patchSize = 1; patchSize <= Math.max(width, height); patchSize++) {
      for (let padding = 0; padding <= Math.ceil(patchSize / 2) - 1; padding++) {
        if (padding >= minPadding) {
          const error = await runTest(upscaler, inputTensor, upscaledTensor, {
            width,
            height,
            patchSize,
            padding,
          });
          if (error) {
            errors.push(error)
          }
        }
      }
    }
  }

  inputTensor.dispose();
  upscaledTensor.dispose();
}


const main = async ({
  minSize: _minSize,
  minPadding: _minPadding,
  size: _size,
  model: modelPath,
  env,
  width: _width,
  height: _height,
  patchSize: _patchSize,
}: {
  width?: string;
  height?: string;
  patchSize?: string;
  minPadding: string
  minSize: string;
  size: string;
  model: string;
  env: string;
}) => {
  if (!isValidEnv(env)) {
    throw new Error(`Invalid env provided: ${env}`);
  }
  const width = _width !== undefined ? parseInt(_width, 10) : undefined;
  const height = _height !== undefined ? parseInt(_height, 10) : undefined;
  const patchSize = _patchSize !== undefined ? parseInt(_patchSize, 10) : undefined;
  const tf = require(`@tensorflow/tfjs-${env}`);
  const Upscaler = getUpscaler(env);
  const size = parseInt(_size, 10);
  const minSize = parseInt(_minSize, 10);
  const minPadding = parseInt(_minPadding, 10);
  const model = getModel(tf, modelPath);
  const upscaler = new Upscaler({
    model,
  });
  const errors: {
    width: number;
    height: number;
    patchSize: number;
    padding: number;
  }[] = [];
  if (width !== undefined && height !== undefined) {
    await assessForWidthAndHeight(tf, upscaler, width, height, errors, minPadding, patchSize);
  } else {
    for (let width = minSize; width <= size; width++) {
      for (let height = minSize; height <= size; height++) {
        await assessForWidthAndHeight(tf, upscaler, width, height, errors, minPadding, patchSize);
      }
    }
  }
  console.log('errors', errors);
}

export const registerScript = (program: Command) => {
  program.command('test-esrgan-in-all-configurations')
    .description('Test a model upscaling for all possible dimensions. Primarily for testing that patch sizes and padding are working as expected')
    .option('-m, --model <string>', 'model to use', DEFAULT_MODEL)
    .option('-e, --env <string>', 'environment', DEFAULT_UPSCALER_ENV)
    .option('-s, --size <number>', 'Size of the image to iteratively test up to', DEFAULT_SIZE)
    .option('-w, --width <number>', 'An optional explicit width')
    .option('-h, --height <number>', 'An optional explicit height')
    .option('-i, --patchSize <number>', 'An optional explicit patch size')
    .option('--min-size <number>', 'Minimum size of the image to iteratively test up to', DEFAULT_MIN_SIZE)
    .option('--min-padding <number>', 'Minimum padding', DEFAULT_MIN_PADDING)
    .action(main);
}
