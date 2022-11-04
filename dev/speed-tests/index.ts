import Upscaler from '../../packages/upscalerjs/src/index';
import * as tf from '@tensorflow/tfjs';
import PixelUpsampler from '../../models/pixel-upsampler/src/4x';
import GANs from '../../models/esrgan-legacy/src/gans';
import './stats';
import { FPS } from './fps';

const start = document.querySelector('#start')!;
const status = document.querySelector('#status')!;
const tensorSize = document.querySelector('#tensor-size')! as HTMLInputElement;
const patchSize = document.querySelector('#patch-size')! as HTMLInputElement;
const includeGans = document.querySelector('input[type=checkbox][name="include-gans"]')! as HTMLInputElement;

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
      output = model.predict(input) as tf.Tensor4D;
    }
    if (output === undefined) {
      throw new Error('No output');
    }
    return output.squeeze() as tf.Tensor3D;
  });
  const predictWithUpscaler = async (upscaler: Upscaler, input: tf.Tensor4D, patchSize: number): Promise<tf.Tensor3D> => {
    return await upscaler.upscale(input, { output: 'tensor', patchSize, padding: 0}) as tf.Tensor3D;
  };

  const benchmark = async () => {
    start.setAttribute('disabled', '');
    const tensorSizeValue = parseInt(tensorSize.value, 10);
    let patchSizeValue = parseInt(patchSize.value, 10);
    if (Number.isNaN(patchSizeValue)) {
      patchSizeValue = tensorSizeValue;
    }
    let times = Math.ceil(tensorSizeValue / patchSizeValue);
    times *= times;
    const input = tf.ones([64, tensorSizeValue, tensorSizeValue, 3,]) as tf.Tensor4D;
    const patchInput = tf.ones([1, patchSizeValue, patchSizeValue, 3,]) as tf.Tensor4D;
    const rows = [
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
      ...(includeGans.checked ? [
        {
          label: 'GANs Raw',
          fn: () => predictWithModel(gansModel, patchInput, times),
          tr: document.querySelector('#gans-raw')!,
        },
        // {
        //   label: 'GANs UpscalerJS',
        //   fn: () => predictWithUpscaler(gansUpscaler, input, patchSizeValue),
        //   tr: document.querySelector('#gans-upscalerjs')!,
        // },
      ] : [])];
    for (const { tr } of rows) {
      tr.querySelector('td.duration')!.innerHTML = ``;
      tr.querySelector('td.fps')!.innerHTML = ``;
    }
    status.innerHTML = `Warming up simple model`;
    await new Promise(r => setTimeout(r, 10));
    tf.tidy(() => simpleModel.predict(patchInput)),
    await tf.nextFrame();
    await simpleUpscaler.upscale(patchInput);
    if (includeGans.checked) {
      status.innerHTML = `Warming up gans model`;
      await new Promise(r => setTimeout(r, 10));
      tf.tidy(() => gansModel.predict(patchInput)),
        await tf.nextFrame();
      await gansUpscaler.upscale(patchInput);
    }
    status.innerHTML = `Warmed up`;
    await tf.nextFrame();
    await new Promise(r => setTimeout(r, 10));
    for (const { label, fn, tr } of rows) {
      await tf.nextFrame();
      status.innerHTML = `Running ${label} Model`;
      const fps = new FPS();
      await tf.nextFrame();
      const start = performance.now();
      let output: undefined | tf.Tensor = undefined;
      try {
        output = await fn();
        console.log(output.shape);
        // if (JSON.stringify(output.shape) !== JSON.stringify([tensorSizeValue * 4, tensorSizeValue * 4, 3])) {
        //   throw new Error(`Size mismatch: ${output.shape}`);
        // }
      } catch (err) {
        console.error(err);
      }
      const duration = (performance.now() - start).toFixed(4);
      if (output !== undefined) {
        output.dispose();
      }
      tr.querySelector('td.duration')!.innerHTML = `${duration}ms`;
      tr.querySelector('td.fps')!.innerHTML = `${fps.report().toFixed(1)}fps`;
      await tf.nextFrame();
    }
    status.innerHTML = `Complete`;
    input.dispose();
    patchInput.dispose();
    start.removeAttribute('disabled');
  }

  status.innerHTML = 'Ready';
  start.removeAttribute('disabled');

  start.addEventListener('click', () => {
    benchmark();
  });
})();
