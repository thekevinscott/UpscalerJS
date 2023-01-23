import * as tfn from '@tensorflow/tfjs-node';
import { 
  isLayersModel,
} from './isLayersModel';

describe('isLayersModel', () => {
  it('returns true if given a layers model', () => {
    const model = tfn.sequential();
    model.add(tfn.layers.dense({units: 1, inputShape: [1]}));
    model.compile({optimizer: 'sgd', loss: 'meanSquaredError'});
    expect(isLayersModel(model)).toEqual(true);
  });
});
