import Upscaler from '../../../packages/upscalerjs/src/index';
import { ModelDefinitionFn, } from '../../../packages/core/src/index';
import maximDenoisingFixture from '../../../models/maxim-denoising/assets/fixture.png';
import maximDenoisingSmall from '../../../models/maxim-denoising/src/small';
import maximDenoisingMedium from '../../../models/maxim-denoising/src/medium';
import maximDeblurringFixture from '../../../models/maxim-deblurring/assets/fixture.png';
import maximDeblurringSmall from '../../../models/maxim-deblurring/src/small';
import maximDeblurringMedium from '../../../models/maxim-deblurring/src/medium';
import maximDerainingFixture from '../../../models/maxim-deraining/assets/fixture.png';
import maximDerainingSmall from '../../../models/maxim-deraining/src/small';
import maximDerainingMedium from '../../../models/maxim-deraining/src/medium';
import maximDehazingIndoorFixture from '../../../models/maxim-dehazing-indoor/assets/fixture.png';
import maximDehazingIndoorSmall from '../../../models/maxim-dehazing-indoor/src/small';
import maximDehazingIndoorMedium from '../../../models/maxim-dehazing-indoor/src/medium';
import maximDehazingOutdoorFixture from '../../../models/maxim-dehazing-outdoor/assets/fixture.png';
import maximDehazingOutdoorSmall from '../../../models/maxim-dehazing-outdoor/src/small';
import maximDehazingOutdoorMedium from '../../../models/maxim-dehazing-outdoor/src/medium';
import maximEnhancementFixture from '../../../models/maxim-enhancement/assets/fixture.png';
import maximEnhancementSmall from '../../../models/maxim-enhancement/src/small';
import maximEnhancementMedium from '../../../models/maxim-enhancement/src/medium';
import maximRetouchingFixture from '../../../models/maxim-retouching/assets/fixture.png';
import maximRetouchingSmall from '../../../models/maxim-retouching/src/small';
import maximRetouchingMedium from '../../../models/maxim-retouching/src/medium';
import * as tf from '@tensorflow/tfjs';
import { makeImg } from './image';

const status = document.getElementById('status')!;

const getModel = async (path: string, modelConfig: ModelDefinitionFn) => {
  const { packageInformation, ...rest } = modelConfig(tf);
  return {
    ...rest,
    path: path,
  };
}

const upscaleImage = async (modelJSON: string, modelConfig: ModelDefinitionFn, img: HTMLImageElement | HTMLCanvasElement) => {
  const model = await getModel(`/models/${modelJSON}`, modelConfig);
  status.innerHTML = 'Starting';
  const upscaler = new Upscaler({
    model,
  });
  const { model: _model } = await upscaler.getModel();
  console.log(_model);
  debugger;
  status.innerHTML = 'Upscaling...';
  const start = performance.now();
  const upscaledImg = await upscaler.upscale(img, {
    patchSize: 64,
    progress: (...args) => console.log(modelJSON, ...args),
  });
  console.log(`Duration: ${((performance.now() - start) / 1000).toFixed(2)}s`);
  status.innerHTML = 'Image upscaled';
  status.innerHTML = 'Image printed';
  return upscaledImg;
}

(async () => {
  for (const [fixture, modelJSON, modelConfig] of [

    [
      maximDenoisingFixture,
      'maxim-denoising/models/small/model.json', 
      maximDenoisingSmall,
    ],
    [
      maximDenoisingFixture,
      'maxim-denoising/models/medium/model.json', 
      maximDenoisingMedium,
    ],


    [
      maximDeblurringFixture,
      'maxim-deblurring/models/small/model.json', 
      maximDeblurringSmall,
    ],
    [
      maximDeblurringFixture,
      'maxim-deblurring/models/medium/model.json', 
      maximDeblurringMedium,
    ],


    [
      maximDerainingFixture,
      'maxim-deraining/models/small/model.json', 
      maximDerainingSmall,
    ],
    [
      maximDerainingFixture,
      'maxim-deraining/models/medium/model.json', 
      maximDerainingMedium,
    ],

    [
      maximRetouchingFixture,
      'maxim-retouching/models/small/model.json', 
      maximRetouchingSmall,
    ],
    [
      maximRetouchingFixture,
      'maxim-retouching/models/medium/model.json', 
      maximRetouchingMedium,
    ],

    [
      maximEnhancementFixture,
      'maxim-enhancement/models/small/model.json', 
      maximEnhancementSmall,
    ],
    [
      maximEnhancementFixture,
      'maxim-enhancement/models/medium/model.json', 
      maximEnhancementMedium,
    ],


    [
      maximDehazingIndoorFixture,
      'maxim-dehazing-indoor/models/small/model.json', 
      maximDehazingIndoorSmall,
    ],
    [
      maximDehazingIndoorFixture,
      'maxim-dehazing-indoor/models/medium/model.json', 
      maximDehazingIndoorMedium,
    ],
    [
      maximDehazingOutdoorFixture,
      'maxim-dehazing-outdoor/models/small/model.json', 
      maximDehazingOutdoorSmall,
    ],
    [
      maximDehazingOutdoorFixture,
      'maxim-dehazing-outdoor/models/medium/model.json', 
      maximDehazingOutdoorMedium,
    ],

  ]) {
    const img = await makeImg(fixture, `Original: ${modelJSON}`, 1.5);
    const upscaledImg = await upscaleImage(modelJSON, modelConfig, img);
    await makeImg(upscaledImg, `Upscaled: ${modelJSON}`);
  }
})();
