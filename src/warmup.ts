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
  for (const [width, height] of sizes) {
    const pred = (await model.predict(
      tf.zeros([1, height, width, 3]),
    )) as tf.Tensor;
    pred.dataSync();
    pred.dispose();
  }
};

export default warmup;
