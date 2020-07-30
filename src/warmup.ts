import * as tf from '@tensorflow/tfjs';
import { WarmupSizes } from './types';

const warmup = async (model: Promise<tf.LayersModel>, sizes: WarmupSizes) => {
  const resolvedModel = await model;
  for (const [width, height] of sizes) {
    const pred = (await resolvedModel.predict(
      tf.zeros([1, height, width, 3]),
    )) as tf.Tensor;
    pred.dataSync();
    pred.dispose();
  }
};

export default warmup;
