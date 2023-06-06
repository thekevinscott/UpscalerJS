import { ModelDefinitionFn } from "../../../../packages/core/src";

const fs = require('fs');
const tf = require('@tensorflow/tfjs-node-gpu');
const Upscaler = require('../../../../packages/upscalerjs/dist/node-gpu/cjs/index.js').default;
const { mkdirpSync } = require("fs-extra");

const getModel = (model: ModelDefinitionFn) => {
  const { packageInformation, ...rest } = model(tf);
  return {
    ...rest,
    path: tf.io.fileSystem(`../../models/${packageInformation?.name.split('/').pop()}/${rest.path}`),
  };
}

const upscaleImage = async (modelPath: string, imagePath: string, outputPath: string) => {
  const model = require(modelPath).default;
  const upscaler = new Upscaler({
    model: getModel(model),
  });

  const imageBuffer = fs.readFileSync(imagePath);
  const tensor = tf.node.decodeImage(imageBuffer).slice([0, 0, 0], [-1, -1, 3]);
  if (tensor.shape[0] !== 16 || tensor.shape[1] !== 16) {
    throw new Error('Incoming tensor shape is not 16')
  }
  const start = performance.now();
  const upscaledTensor = await upscaler.upscale(tensor);
  console.log(`Duration for ${outputPath}: ${((performance.now() - start) / 1000).toFixed(2)}s`);
  tensor.dispose();
  return upscaledTensor;
}

(async () => {
  const models = [
    'esrgan-slim',
    'esrgan-medium',
    // 'deblurring',
    // 'denoising',
    // 'dehazing-indoor',
    // 'dehazing-outdoor',
    // 'deraining',
    // 'enhancement',
    // 'retouching',
  ];

  for (const model of models) {
    for (const size of [
      // // 'large', 
      // // 'medium', 
      // 'small',
      '4x',
      '8x',
    ]) {
      console.log('Running', size, model);
      // const modelPath = `../../models/maxim-${model}/src/${size}`;
      // const imagePath = `../../models/maxim-${model}/test/__fixtures__/fixture.png`;
      // const outputPath = `../../models/maxim-${model}/test/__fixtures__/${size}/result.png`;
      
      const modelPath = `../../models/${model}/src/${size}`;
      const imagePath = `../../models/${model}/test/__fixtures__/fixture.png`;
      const outputPath = `../../models/${model}/test/__fixtures__/${size}/result.png`;
      mkdirpSync(outputPath.split('/').slice(0, -1).join('/'));
      const upscaledTensor = await upscaleImage(modelPath, imagePath, outputPath);
      const expectedShape = size === '4x' ? 64 : 128;
      if (upscaledTensor.shape[0] !== expectedShape || upscaledTensor.shape[1] !== expectedShape) {
        throw new Error(`Mismatch, shape is ${JSON.stringify(upscaledTensor.shape)}`)
      }
      const upscaledPng = await tf.node.encodePng(upscaledTensor);
      upscaledTensor.dispose();
      fs.writeFileSync(outputPath, upscaledPng);
    }
  }
})();
