import Upscaler from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import flower from './flower-small.png';

const upscaler = new Upscaler();

onmessage = async (e) => {
  try {
    await upscaler.upscale('foo', {
      patchSize: 2,
      padding: 2,
      output: 'tensor',
    });
    console.log('Should not get here');
  } catch(err) {
    console.log('Expected err', err.message);
  }

  const [data, shape] = e.data;

  const tensor = tf.tensor(data, shape);

  for (const [output, progressOutput] of [
    [undefined, undefined],
    ['base64', undefined],
    ['tensor', 'base64'],
    ['base64', 'tensor'],
    // these should work
    ['tensor', 'tensor'],
    ['tensor'],
  ]) {
    try {
      await upscaler.upscale(tensor, {
        patchSize: 2,
        padding: 2,
        output,
        progressOutput,
      });
      console.log('Success, in worker thread, for', output, progressOutput);
    } catch(err) {
      console.log('Err, in worker thread, for \n\n', output, progressOutput, '\n\n', err);
    }
  }
  tensor.dispose();
}

