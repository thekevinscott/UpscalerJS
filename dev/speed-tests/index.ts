import Upscaler from '../../packages/upscalerjs/src/index';
import * as tf from '@tensorflow/tfjs';
import PixelUpsampler from '../../models/pixel-upsampler/src/4x';
import GANs from '../../models/esrgan-legacy/src/gans';
import './stats';
import { FPS } from './fps';

const start = document.querySelector('#start')!;
const status = document.querySelector('#status')!;
const tensorSize = document.querySelector('#tensor-size')! as HTMLInputElement;

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

  const predictWithModel = async (model: tf.LayersModel, input: tf.Tensor4D): Promise<tf.Tensor3D> => tf.tidy(() => {
    const output = model.predict(input) as tf.Tensor4D;
    return output.squeeze() as tf.Tensor3D;
  });
  const predictWithUpscaler = async (upscaler: Upscaler, input: tf.Tensor4D): Promise<tf.Tensor3D> => {
    return await upscaler.upscale(input, { output: 'tensor'}) as tf.Tensor3D;
  };

  const benchmark = async () => {
    start.setAttribute('disabled', '');
    const patchSize = parseInt(tensorSize.value, 10);
    const input = tf.zeros([1, patchSize, patchSize, 3,]) as tf.Tensor4D;
    status.innerHTML = `Warming up`;
    await tf.nextFrame();
    await new Promise(r => setTimeout(r, 10));
    await Promise.all([
      tf.tidy(() => simpleModel.predict(input)),
      tf.tidy(() => gansModel.predict(input)),
    ]);
    await tf.nextFrame();
    status.innerHTML = `Warmed up`;
    for (const { label, fn, tr } of [
      {
        label: 'Simple Raw',
        fn: () => predictWithModel(simpleModel, input),
        tr: document.querySelector('#simple-raw')!,
      },
      {
        label: 'Simple UpscalerJS',
        fn: () => predictWithUpscaler(simpleUpscaler, input),
        tr: document.querySelector('#simple-upscalerjs')!,
      },
      {
        label: 'GANs Raw',
        fn: () => predictWithModel(gansModel, input),
        tr: document.querySelector('#gans-raw')!,
      },
      {
        label: 'GANs UpscalerJS',
        fn: () => predictWithUpscaler(gansUpscaler, input),
        tr: document.querySelector('#gans-upscalerjs')!,
      },
    ]) {
      await tf.nextFrame();
      status.innerHTML = `Running ${label} Model`;
      const fps = new FPS();
      await tf.nextFrame();
      const start = performance.now();
      let output: undefined | tf.Tensor = undefined;
      try {
        output = await fn();
        if (JSON.stringify(output.shape) !== JSON.stringify([patchSize * 4, patchSize * 4, 3])) {
          throw new Error(`Size mismatch: ${output.shape}`);
        }
      } catch (err) {
        console.error(err);
      }
      if (output !== undefined) {
        output.dispose();
      }
      const duration = (performance.now() - start).toFixed(4);
      tr.querySelector('td.duration')!.innerHTML = `${duration}ms`;
      tr.querySelector('td.fps')!.innerHTML = `${fps.report().toFixed(1)}fps`;
      await tf.nextFrame();
    }
    status.innerHTML = `Complete`;
    input.dispose();
    start.removeAttribute('disabled');
  }

  status.innerHTML = 'Ready';
  start.removeAttribute('disabled');

  start.addEventListener('click', () => {
    benchmark();
  });
})();
