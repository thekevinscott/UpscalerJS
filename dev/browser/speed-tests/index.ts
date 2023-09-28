import Upscaler from '../../../packages/upscalerjs/src/esm';
import * as tf from '@tensorflow/tfjs';
import PixelUpsampler from '../../../models/pixel-upsampler/src/4x';
import GANs from '../../../models/esrgan-legacy/src/gans';
import './stats';
import { FPS } from './fps';

const startButton = document.querySelector('#start')!;
const status = document.querySelector('#status')!;
const tensorSize = document.querySelector('#tensor-size')! as HTMLInputElement;
const patchSize = document.querySelector('#patch-size')! as HTMLInputElement;
const includeGans = document.querySelector('input[type=checkbox][name="include-gans"]')! as HTMLInputElement;
const includeSimple = document.querySelector('input[type=checkbox][name="include-simple"]')! as HTMLInputElement;

let simpleWarmedUp = false;
let gansWarmedUp = false;

(async () => {
  const simpleUpscaler = new Upscaler({
    model: PixelUpsampler,
  });
  const gansUpscaler = new Upscaler({
    model: GANs,
  });
  const [{ model: simpleModel }, { model: gansModel }] = await Promise.all([
    simpleUpscaler.getModel(),
    gansUpscaler.getModel(),
  ]);

  const predictWithModel = async (model: tf.LayersModel, input: tf.Tensor4D, times: number): Promise<tf.Tensor3D> => tf.tidy(() => {
    let output: tf.Tensor | undefined;
    for (let i = 0; i < times; i++) {
      const start = performance.now();
      output = model.predict(input) as tf.Tensor4D;
      console.log('regular model loop', i, performance.now() - start);
    }
    if (output === undefined) {
      throw new Error('No output');
    }
    return output.squeeze() as tf.Tensor3D;
  });
  const predictWithUpscaler = async (upscaler: Upscaler, input: tf.Tensor4D, patchSize?: number): Promise<tf.Tensor3D> => {
    console.log('----- predict with upscaler')
    let options: any = { output: 'tensor' };
    if (patchSize) {
      options.patchSize = patchSize;
      options.padding = 0;
    }
    return await upscaler.upscale(input, options);
  };

  const warmup = async (patchInput: tf.Tensor4D, input: tf.Tensor4D) => {
    const tensorSizeValue = parseInt(tensorSize.value, 10);
    if (includeSimple.checked && simpleWarmedUp === false) {
      status.innerHTML = `Warming up simple model`;
      await new Promise(r => setTimeout(r, 10));
      tf.tidy(() => simpleModel.predict(patchInput)),
      await tf.nextFrame();
      simpleWarmedUp = true;
      await simpleUpscaler.warmup([{
        patchSize: patchInput.shape[1],
        padding: 0,
      }]);
    }
    if (includeGans.checked && gansWarmedUp === false) {
      gansWarmedUp = true;
      status.innerHTML = `Warming up gans model`;
      await tf.nextFrame();
      tf.tidy(() => gansModel.predict(patchInput));
      await tf.nextFrame();
      await gansUpscaler.warmup([{
        patchSize: patchInput.shape[1],
        padding: 0,
      }]);
    }
    status.innerHTML = `Warmed up`;
    await tf.nextFrame();
  }

  const benchmark = async () => {
    await tf.nextFrame();
    const benchmarkStart = performance.now();
    startButton.setAttribute('disabled', '');
    const tensorSizeValue = parseInt(tensorSize.value, 10);
    let patchSizeValue: number | undefined = parseInt(patchSize.value, 10);
    let times = 1;
    const input = tf.ones([1, tensorSizeValue, tensorSizeValue, 3,]) as tf.Tensor4D;
    let patchInput = input.clone();
    await tf.nextFrame();
    if (Number.isNaN(patchSizeValue)) {
      patchSizeValue = undefined;
    } else {
      times = Math.ceil(tensorSizeValue / patchSizeValue);
      times *= times;
      patchInput = tf.ones([1, patchSizeValue, patchSizeValue, 3,]) as tf.Tensor4D;
    }
    await tf.nextFrame();
    const rows = [
      ...(includeSimple.checked ? [
      {
        label: 'Simple Raw',
        fn: () => predictWithModel(simpleModel, patchInput, times),
        tr: document.querySelector('#simple-raw')!,
      },
      {
        label: 'Simple UpscalerJS',
        fn: () => predictWithUpscaler(simpleUpscaler, input, patchSizeValue),
        tr: document.querySelector('#simple-upscalerjs')!,
      },
    ] : []),
      ...(includeGans.checked ? [
        {
          label: 'GANs Raw',
          fn: () => predictWithModel(gansModel, patchInput, times),
          tr: document.querySelector('#gans-raw')!,
        },
        {
          label: 'GANs UpscalerJS',
          fn: () => predictWithUpscaler(gansUpscaler, input, patchSizeValue),
          tr: document.querySelector('#gans-upscalerjs')!,
        },
      ] : [])];
    for (const { tr } of rows) {
      tr.querySelector('td.duration')!.innerHTML = ``;
      tr.querySelector('td.fps')!.innerHTML = ``;
    }
    await tf.nextFrame();
    await warmup(patchInput, input);
    await tf.nextFrame();
    const outputs = [];
    for (const { label, fn, tr } of rows) {
      status.innerHTML = `Running ${label} Model`;
      const fps = new FPS();
      await tf.nextFrame();
      const start = performance.now();
      try {
        outputs.push(await fn());
      } catch (err) {
        console.error(err);
      }
      const duration = (performance.now() - start).toFixed(4);
      const fpsReport = fps.report().toFixed(1);
      await tf.nextFrame();
      tr.querySelector('td.fps')!.innerHTML = `${fpsReport}fps`;
      tr.querySelector('td.duration')!.innerHTML = `${duration}ms`;
      await tf.nextFrame();
    }
    status.innerHTML = `Complete`;
    startButton.removeAttribute('disabled');
    console.log('Whole benchmark process took', performance.now() - benchmarkStart);
    input.dispose();
    patchInput.dispose();
    outputs.forEach(output => {
      if (output) {
        output.dispose();
      }
    });
  }

  status.innerHTML = 'Ready';
  startButton.removeAttribute('disabled');

  startButton.addEventListener('click', () => {
    benchmark();
  });
})();
