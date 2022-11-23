import Upscaler from '../../packages/upscalerjs/src/index';
import model from '../../models/esrgan-legacy/src/div2k/4x';
import flower from './flower.png';
import * as tf from '@tensorflow/tfjs';
const MODEL = '/models/esrgan-legacy/models/div2k/4x/model.json';

const status = document.getElementById('status')!;

const getModel = (path: string) => {
  const { packageInformation, ...rest } = model(tf);
  return {
    ...rest,
    path: path,
  };
}

const makeImg = (path: string, label: string) => {
  const img = new Image();
  img.src = path;
  img.onload = () => {
    const divEl = document.createElement('div');
    const imgEl = document.createElement('img');
    const labelEl = document.createElement('label');
    labelEl.innerText = label;
    imgEl.src = path;
    imgEl.width = img.width;
    imgEl.height = img.height;
    imgEl.appendChild(img);

    divEl.appendChild(labelEl);
    divEl.appendChild(imgEl);
    divEl.appendChild(document.createElement('hr'));

    document.body.appendChild(divEl);
  }
}

(async () => {
  makeImg(flower, 'Original');
  const model = getModel(MODEL);
  status.innerHTML = 'Starting';
  const upscaler = new Upscaler({
    model,
  });
  status.innerHTML = 'Upscaling...';
  const upscaledImg = await upscaler.upscale(flower);
  status.innerHTML = 'Image upscaled';
  makeImg(upscaledImg, 'Upscaled');
  status.innerHTML = 'Image printed';
})();
