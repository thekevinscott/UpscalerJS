const fs = require('fs');
const tf = require('@tensorflow/tfjs-node-gpu');
const Upscaler = require('../../packages/upscalerjs/dist/node-gpu/cjs/index.js').default;
const { mkdirpSync } = require("fs-extra");

const getModel = (model: (tf: any) => any) => {
  const { packageInformation, ...rest } = model(tf);
  return {
    ...rest,
    scale: 1,
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
  const start = performance.now();
  const upscaledTensor = await upscaler.upscale(tensor);
  console.log(`Duration for ${outputPath}: ${((performance.now() - start) / 1000).toFixed(2)}s`);
  tensor.dispose();
  const upscaledPng = await tf.node.encodePng(upscaledTensor);
  fs.writeFileSync(outputPath, upscaledPng);
  upscaledTensor.dispose();
}

(async () => {
  const models = [
    'esrgan',
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
      'slim',
      'medium',
    ]) {
      console.log('Running', size, model);
      // const modelPath = `../../models/maxim-${model}/src/${size}`;
      // const imagePath = `../../models/maxim-${model}/test/__fixtures__/fixture.png`;
      // const outputPath = `../../models/maxim-${model}/test/__fixtures__/${size}/result.png`;
      
      const modelName = [model, size].join('-');
      const modelPath = `../../models/${modelName}/src/8x`;
      const imagePath = `../../models/${modelName}/test/__fixtures__/fixture.png`;
      const outputPath = `../../models/${modelName}/test/__fixtures__/8x/result.png`;
      mkdirpSync('output');
      await upscaleImage(modelPath, imagePath, outputPath);
    }
  }
})();
