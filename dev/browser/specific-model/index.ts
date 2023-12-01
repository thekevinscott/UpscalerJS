import * as tf from '@tensorflow/tfjs';
import { makeImg } from './image';
import { AVAILABLE_PACKAGES, loadAvailableModels } from './filters';
import Upscaler, { ModelDefinition } from '../../../packages/upscalerjs/src/browser/esm/index.js';
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
  console.log(importedModel)
  const modelDefinition = (importedModel).default;
  console.log(modelDefinition)
  const { packageInformation, ...modelJSON }= modelDefinition;

  const fixture = await getFixture(packageName, modelName);

  const img = await makeImg(fixture, `Original: ${packageName}/${modelName}`, 1);
  const modelPath = getModelPath(packageName, modelJSON.path);
  console.log(modelJSON)
  const upscaledImg = await upscaleImage({
    ...modelJSON,
    path: modelPath,
  }, img, 64, 2);
  await makeImg(upscaledImg, `Upscaled: ${packageName}/${modelName}`);
};


const upscaleImage = async (model: ModelDefinition, img: HTMLImageElement | HTMLCanvasElement, patchSize?: number, padding?: number) => {
  status.innerHTML = 'Starting';
  const upscaler = new Upscaler({
    model,
  });
  status.innerHTML = 'Upscaling...';
  const start = performance.now();
  console.log({ patchSize, padding })
  const upscaledImg = await upscaler.upscale(img, {
    patchSize,
    padding,
    progress: console.log,
  });
  console.log(`Duration: ${((performance.now() - start) / 1000).toFixed(2)}s`);
  status.innerHTML = 'Image upscaled';
  status.innerHTML = 'Image printed';
  return upscaledImg;
}
