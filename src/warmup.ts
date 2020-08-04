import * as tf from '@tensorflow/tfjs';
import { WarmupSizes, IModelDefinition } from './types';

const warmup = async (
  modelPackage: Promise<{
    model: tf.LayersModel;
    modelDefinition: IModelDefinition;
  }>,
  sizes: WarmupSizes,
) => {
  const { model } = await modelPackage;
  for (const size of sizes) {
    if (typeof(size[0]) !== 'number' || typeof(size[1]) !== 'number') {
      throw new Error(`Invalid value passed to warmup in warmupSizes. Expected two numbers, got ${size}`)
    }
    const [width, height] = size;
    const pred = (await model.predict(
      tf.zeros([1, height, width, 3]),
    )) as tf.Tensor;
    pred.dataSync();
    pred.dispose();
  }
};

export default warmup;
