import * as tf from '@tensorflow/tfjs';
// import { ModelDefinitionFn, } from '../../../packages/core/src/index';
import { makeImg } from './image';
import { AVAILABLE_PACKAGES, loadAvailableModels } from './filters';
// import Upscaler, { ModelDefinition } from 'upscaler';
import Upscaler, { ModelDefinition } from '../../../packages/upscalerjs/src/index';
import { getFixture, getModelPath, getRoot, importModel, loadPackageJSON } from './utils';

const packages = document.getElementById('packages') as HTMLSelectElement;
const models = document.getElementById('models') as HTMLSelectElement;
const status = document.getElementById('status') as HTMLDivElement;

const addOptions = (target: Element, arr: Set<string> | string[], includeFirstBlank = true) => {
  if (includeFirstBlank) {
    const option = document.createElement('option');
    target.appendChild(option);
  }

  arr.forEach(value => {
    const option = document.createElement('option');
    option.innerHTML = value;
    target.appendChild(option);
  });
}

addOptions(packages, AVAILABLE_PACKAGES);

packages.addEventListener('change', async (e) => {
  models.innerHTML = '';
  const target = e.target as HTMLSelectElement;
  const packageName = target.value;
  const availableModels = await loadAvailableModels(packageName);

  addOptions(models, availableModels, availableModels.length !== 1);
  if (availableModels.length === 1) {
    const modelName = availableModels[0];
    await loadModel(packages.value, modelName);
  }
});

models.addEventListener('change', async (e) => {
  const target = e.target as HTMLSelectElement;
  const modelName = target.value;
  await loadModel(packages.value, modelName);
});

const loadModel = async (packageName: string, modelName: string) => {
  console.log(packageName, modelName);
  const importedModel = await importModel(packageName, modelName);
  const modelDefinition = (importedModel).default;
  const { packageInformation, ...modelJSON }= typeof modelDefinition === 'function' ? modelDefinition(tf) : modelDefinition;

  const fixture = await getFixture(packageName, modelName);

  const img = await makeImg(fixture, `Original: ${packageName}/${modelName}`, 1);
  const modelPath = getModelPath(packageName, modelJSON.path);
  const upscaledImg = await upscaleImage({
    ...modelJSON,
    path: modelPath,
  }, img);
  await makeImg(upscaledImg, `Upscaled: ${packageName}/${modelName}`);
};


const upscaleImage = async (model: ModelDefinition, img: HTMLImageElement | HTMLCanvasElement, patchSize: undefined | number = 64) => {
  status.innerHTML = 'Starting';
  const upscaler = new Upscaler({
    model,
  });
  status.innerHTML = 'Upscaling...';
  const start = performance.now();
  const upscaledImg = await upscaler.upscale(img, {
    patchSize,
    progress: console.log,
  });
  console.log(`Duration: ${((performance.now() - start) / 1000).toFixed(2)}s`);
  status.innerHTML = 'Image upscaled';
  status.innerHTML = 'Image printed';
  return upscaledImg;
}
