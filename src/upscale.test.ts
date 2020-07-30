import * as tf from '@tensorflow/tfjs';
import { predict } from './upscale';

describe('predict', () => {
  it('should make a prediction', async () => {
    const img: tf.Tensor3D = tf.tensor(
      [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4],
      [2, 2, 3],
    );
    const pred = {
      squeeze: jest.fn(() => 'foo'),
    };
    const model = ({
      predict: jest.fn(async () => {
        return pred;
      }),
    } as unknown) as tf.LayersModel;
    const result = await predict(model, img.expandDims(0));
    expect(model.predict).toHaveBeenCalledWith(
      expect.objectContaining({
        shape: [1, 2, 2, 3],
      }),
    );
    expect(pred.squeeze).toHaveBeenCalled();
    expect(result).toEqual('foo');
  });
});
