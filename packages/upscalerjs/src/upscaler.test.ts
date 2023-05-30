import { Upscaler } from './upscaler';
import type { LayersModel } from '@tensorflow/tfjs';
import { loadModel as _loadModel, } from './loadModel.generated';
import { cancellableWarmup as _cancellableWarmup, } from './warmup';
import { getImageAsTensor as _getImageAsTensor } from './image.generated';
import { cancellableUpscale as _cancellableUpscale, } from './upscale';
import { WarmupSizes } from './types';
import { ModelDefinition } from '@upscalerjs/core';
import { mockFn } from '../../../test/lib/shared/mockers';
import * as _tf from '@tensorflow/tfjs-node';
jest.mock('./image.generated', () => {
  const { getImageAsTensor, ...rest } = jest.requireActual('./image.generated');
  return {
    ...rest,
    getImageAsTensor: jest.fn(getImageAsTensor),
  };
});
jest.mock('./upscale', () => {
  const { cancellableUpscale, ...rest } = jest.requireActual('./upscale');
  return {
    ...rest,
    cancellableUpscale: jest.fn(cancellableUpscale),
  };
});
jest.mock('./loadModel.generated', () => {
  const { loadModel, ...rest } = jest.requireActual('./loadModel.generated');
  return {
    ...rest,
    loadModel: jest.fn(loadModel),
  };
});
jest.mock('./warmup', () => {
  const { cancellableWarmup, ...rest } = jest.requireActual('./warmup');
  return {
    ...rest,
    cancellableWarmup: jest.fn(cancellableWarmup),
  };
});
jest.mock('./dependencies.generated', () => {
  const dependencies = jest.requireActual('./dependencies.generated');
  return {
    ...dependencies,
  };
});

const cancellableUpscale = mockFn(_cancellableUpscale);
const cancellableWarmup = mockFn(_cancellableWarmup);
const loadModel = mockFn(_loadModel);
const getImageAsTensor = mockFn(_getImageAsTensor);

describe('Upscaler', () => {
  beforeEach(() => {
    cancellableUpscale.mockClear();
    cancellableWarmup.mockClear();
    loadModel.mockClear();
    getImageAsTensor.mockClear();
  });

  it('is able to abort multiple times', (): Promise<void> => new Promise(async (resolve, reject) => {
    loadModel.mockImplementation(async () => {
      return {
        modelDefinition: {
          path: 'foo',
          modelType: 'layers',
          scale: 2,
        },
        model: {
          predict: jest.fn(() => _tf.ones([1,2,2,3])),
          inputs: [{
            shape: [null, null, null, 3],
          }]
        } as unknown as LayersModel,
      };
    });
    getImageAsTensor.mockImplementation(async () => _tf.ones([1,2,2,3]));

    const tick = () => new Promise(resolve => setTimeout(resolve));
    let count = 0;
    cancellableUpscale.mockImplementation(async function (_1, _2, { signal }: {
      signal: AbortSignal;
    }) {
      try {
        if (count === 2) {
          resolve();
        } else {
          count++;
          expect(signal.aborted).toBe(false);
          upscaler.abort();
          expect(signal.aborted).toBe(true);
        }
      } catch (err) {
        reject(err);
      }
      return '';
    });

    const upscaler = new Upscaler();
    upscaler.execute('foo');
    await tick();
    upscaler.execute('foo');
    await tick();
    upscaler.execute('foo');
    await tick();
  }), 100);

  it('is able to dispose', async () => {
    const dispose = jest.fn();
    const mockModel = {
      dispose,
    };
    loadModel.mockImplementation(async () => ({
      modelDefinition: {
        path: 'foo',
        modelType: 'layers',
        scale: 2,
      },
      model: mockModel as unknown as LayersModel,
    }));
    const upscaler = new Upscaler();
    await upscaler.dispose();
    expect(dispose).toHaveBeenCalled();

  });

  it('can handle a failing loadModel', (done) => {
    loadModel.mockImplementation(async () => {
      await new Promise(r => setTimeout(r));
      throw new Error('Fail!')
    });
    const upscaler = new Upscaler();
    upscaler.ready.then(() => {
      throw new Error('incorrectly written test');
    }).catch(err => {
      expect(err.message).toEqual('Fail!');
      done();
    });
  });

  describe('warmups', () => {
    it('calls warmup from constructor', async () => {
      const modelDefinitionPromise = new Promise<{
        modelDefinition: ModelDefinition;
        model: LayersModel;
      }>(resolve => resolve({
        modelDefinition: {
          path: 'foo',
          modelType: 'layers',
          scale: 2,
        },
        model: 'foo' as unknown as LayersModel,
      }));
      loadModel.mockImplementation(() => modelDefinitionPromise);
      cancellableWarmup.mockImplementation(async () => { });
      const warmupSizes: WarmupSizes = [2,];
      new Upscaler({
        warmupSizes,
      });
      await new Promise(r => setTimeout(r));
      expect(cancellableWarmup).toBeCalled();
      expect(cancellableWarmup).toBeCalledWith(modelDefinitionPromise, warmupSizes, undefined, expect.any(Object));
    });

    it('is able to warmup with a numeric array of warmup sizes', async () => {
      const modelDefinitionPromise = new Promise<{
        modelDefinition: ModelDefinition;
        model: LayersModel;
      }>(resolve => resolve({
        modelDefinition: {
          path: 'foo',
          modelType: 'layers',
          scale: 2,
        },
        model: 'foo' as unknown as LayersModel,
      }));
      loadModel.mockImplementation(() => modelDefinitionPromise);
      cancellableWarmup.mockImplementation(async () => { });
      const upscaler = new Upscaler();
      const warmupSizes: WarmupSizes = [2,];
      await upscaler.warmup(warmupSizes);
      expect(cancellableWarmup).toBeCalledWith(modelDefinitionPromise, warmupSizes, undefined, expect.any(Object));
    });

    it('is able to warmup with a patchSize array of warmup sizes', async () => {
      const modelDefinitionPromise = new Promise<{
        modelDefinition: ModelDefinition;
        model: LayersModel;
      }>(resolve => resolve({
        modelDefinition: {
          path: 'foo',
          modelType: 'layers',
          scale: 2,
        },
        model: 'foo' as unknown as LayersModel,
      }));
      loadModel.mockImplementation(() => modelDefinitionPromise);
      cancellableWarmup.mockImplementation(async () => { });
      const upscaler = new Upscaler();
      const warmupSizes: WarmupSizes = [{ patchSize: 32, padding: 2 }];
      await upscaler.warmup(warmupSizes);
      expect(cancellableWarmup).toBeCalledWith(modelDefinitionPromise, warmupSizes, undefined, expect.any(Object));
    });

    it('is able to warmup with a numeric warmup size', async () => {
      const modelDefinitionPromise = new Promise<{
        modelDefinition: ModelDefinition;
        model: LayersModel;
      }>(resolve => resolve({
        modelDefinition: {
          path: 'foo',
          modelType: 'layers',
          scale: 2,
        },
        model: 'foo' as unknown as LayersModel,
      }));
      loadModel.mockImplementation(() => modelDefinitionPromise);
      cancellableWarmup.mockImplementation(async () => { });
      const upscaler = new Upscaler();
      const warmupSizes: WarmupSizes = [2, 2];
      await upscaler.warmup(warmupSizes);
      expect(cancellableWarmup).toBeCalledWith(modelDefinitionPromise, warmupSizes, undefined, expect.any(Object));
    });

    it('is able to warmup with a patchSize warmup sizes', async () => {
      const modelDefinitionPromise = new Promise<{
        modelDefinition: ModelDefinition;
        model: LayersModel;
      }>(resolve => resolve({
        modelDefinition: {
          path: 'foo',
          modelType: 'layers',
          scale: 2,
        },
        model: 'foo' as unknown as LayersModel,
      }));
      loadModel.mockImplementation(() => modelDefinitionPromise);
      cancellableWarmup.mockImplementation(async () => { });
      const upscaler = new Upscaler();
      const warmupSizes: WarmupSizes = { patchSize: 32, padding: 2 };
      await upscaler.warmup(warmupSizes);
      expect(cancellableWarmup).toBeCalledWith(modelDefinitionPromise, warmupSizes, undefined, expect.any(Object));
    });
  });
});
