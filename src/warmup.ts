import * as tf from '@tensorflow/tfjs-node';

const warmup = async (model: Promise<tf.LayersModel>, sizes: Array<[number, number]>) => {
  const resolvedModel = await model;
  for (let i = 0; i < sizes.length; i++) {
    const [width, height] = sizes[i];
    const pred = (await resolvedModel.predict(
      tf.zeros([1, height, width, 3]),
    )) as tf.Tensor;
    pred.dataSync();
    pred.dispose();
  }
}

export default warmup;
