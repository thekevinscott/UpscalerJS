import { Upscaler } from './upscaler';
import { vi } from 'vitest';
import type { LayersModel } from '@tensorflow/tfjs';
import { loadModel } from './loadModel.generated';
import { getModel } from './model-utils';
import { cancellableWarmup } from './warmup';
import { getImageAsTensor } from './image.generated';
import { cancellableUpscale } from './upscale';
import { WarmupSizes } from './types';
import { ModelDefinition } from '@upscalerjs/core';
import { tf, } from './dependencies.generated';
import * as tfn from '@tensorflow/tfjs-node';

import type * as imageGenerated from './image.generated';
import type * as upscale from './upscale';
import type * as loadModelGenerated from './loadModel.generated';
import type * as modelUtils from './model-utils';
import type * as warmup from './warmup';
import type * as dependenciesGenerated from './dependencies.generated';

vi.mock('./image.generated', async () => {
  const { getImageAsTensor, ...rest } = await vi.importActual('./image.generated') as typeof imageGenerated;
  return {
    ...rest,
    getImageAsTensor: vi.fn(getImageAsTensor),
  };
});
vi.mock('./upscale', async () => {
  const { cancellableUpscale, ...rest } = await vi.importActual('./upscale') as typeof upscale;
  return {
    ...rest,
    cancellableUpscale: vi.fn(cancellableUpscale),
  };
});
vi.mock('./loadModel.generated', async () => {
  const { loadModel, ...rest } = await vi.importActual('./loadModel.generated') as typeof loadModelGenerated;
  return {
    ...rest,
    loadModel: vi.fn(loadModel),
  };
});
vi.mock('./model-utils', async () => {
  const { getModel, ...rest } = await vi.importActual('./model-utils') as typeof modelUtils;
  return {
    ...rest,
    getModel: vi.fn(getModel),
  };
});
vi.mock('./warmup', async () => {
  const { cancellableWarmup, ...rest } = await vi.importActual('./warmup') as typeof warmup;
  return {
    ...rest,
    cancellableWarmup: vi.fn(cancellableWarmup),
  };
});
vi.mock('./dependencies.generated', async () => {
  const dependencies = await vi.importActual('./dependencies.generated') as typeof dependenciesGenerated;
  return {
    ...dependencies,
  };
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Upscaler', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('is able to abort multiple times', (): Promise<void> => new Promise(async (resolve, reject) => {
    const modelDefinition: ModelDefinition = {
      path: 'foo',
      modelType: 'layers',
      scale: 2,
    };
    vi.mocked(getModel).mockImplementation(async () => modelDefinition);
    vi.mocked(loadModel).mockImplementation(async () => {
      return {
        modelDefinition,
        model: {
          predict: vi.fn(() => tfn.ones([1,2,2,3])),
          inputs: [{
            shape: [null, null, null, 3],
          }]
        } as unknown as LayersModel,
      };
    });
    vi.mocked(getImageAsTensor).mockImplementation(() => Promise.resolve(tfn.ones([1,2,2,3])));

    const tick = () => new Promise(resolve => setTimeout(resolve));
    let count = 0;
    vi.mocked(cancellableUpscale).mockImplementation(async function (_0, _1, _2, { signal }: {
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

  describe('dispose', () => {
    it('is able to dispose of a model', async () => {
      const dispose = vi.fn();
      const mockModel = {
        dispose,
      };
      const modelDefinition: ModelDefinition = {
        path: 'foo',
        modelType: 'layers',
        scale: 2,
      };
      vi.mocked(getModel).mockImplementation(async () => modelDefinition);
      vi.mocked(loadModel).mockImplementation(async () => ({
        modelDefinition,
        model: mockModel as unknown as LayersModel,
      }));
      const upscaler = new Upscaler();
      await upscaler.dispose();
      expect(dispose).toHaveBeenCalled();
    });

    it('is able to call teardown function, if one is present', async () => {
      const dispose = vi.fn();
      const mockModel = {
        dispose,
      };
      const teardown = vi.fn().mockImplementation(() => {});
      const modelDefinition: ModelDefinition = {
        teardown,
        path: 'foo',
        modelType: 'layers',
        scale: 2,
      };
      vi.mocked(getModel).mockImplementation(async () => modelDefinition);
      vi.mocked(loadModel).mockImplementation(async () => ({
        modelDefinition,
        model: mockModel as unknown as LayersModel,
      }));
      const upscaler = new Upscaler();
      await upscaler.dispose();
      expect(teardown).toHaveBeenCalled();
    });

    it('is able to call an async teardown function, if one is present', async () => {
      const dispose = vi.fn();
      const mockModel = {
        dispose,
      };
      let complete = false;
      const teardown = vi.fn().mockImplementation(async () => {
        await wait(0);
        complete = true;
      });
      const modelDefinition: ModelDefinition = {
        teardown,
        path: 'foo',
        modelType: 'layers',
        scale: 2,
      };
      vi.mocked(getModel).mockImplementation(async () => modelDefinition);
      vi.mocked(loadModel).mockImplementation(async () => ({
        modelDefinition: {
          teardown,
          path: 'foo',
          modelType: 'layers' as 'layers',
          scale: 2,
        },
        model: mockModel as unknown as LayersModel,
      }));
      const upscaler = new Upscaler();
      await upscaler.dispose();
      expect(teardown).toHaveBeenCalled();
      expect(complete).toEqual(true);
    });
  });

  it('can handle a failing loadModel', () => new Promise<void>(done => {
    vi.mocked(loadModel).mockImplementation(async () => {
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
  }));

  describe('warmups', () => {
    it('calls warmup from constructor', async () => {
      const modelDefinition: ModelDefinition = {
        path: 'foo',
        modelType: 'layers',
        scale: 2,
      };
      const modelDefinitionPromise = new Promise<{
        modelDefinition: ModelDefinition;
        model: LayersModel;
      }>(resolve => resolve({
        modelDefinition,
        model: 'foo' as unknown as LayersModel,
      }));
      vi.mocked(loadModel).mockImplementation(() => modelDefinitionPromise);
      vi.mocked(getModel).mockImplementation(async () => modelDefinition);
      vi.mocked(cancellableWarmup).mockImplementation(async () => { });
      const warmupSizes: WarmupSizes = [2,];
      new Upscaler({
        warmupSizes,
      });
      await new Promise(r => setTimeout(r));
      expect(cancellableWarmup).toBeCalled();
      expect(cancellableWarmup).toBeCalledWith(tf, modelDefinitionPromise, warmupSizes, undefined, expect.any(Object));
    });

    it('is able to warmup with a numeric array of warmup sizes', async () => {
      const modelDefinition: ModelDefinition = {
        path: 'foo',
        modelType: 'layers',
        scale: 2,
      };
      const modelDefinitionPromise = new Promise<{
        modelDefinition: ModelDefinition;
        model: LayersModel;
      }>(resolve => resolve({
        modelDefinition,
        model: 'foo' as unknown as LayersModel,
      }));
      vi.mocked(loadModel).mockImplementation(() => modelDefinitionPromise);
      vi.mocked(getModel).mockImplementation(async () => modelDefinition);
      vi.mocked(cancellableWarmup).mockImplementation(async () => { });
      const upscaler = new Upscaler();
      const warmupSizes: WarmupSizes = [2,];
      await upscaler.warmup(warmupSizes);
      expect(cancellableWarmup).toBeCalledWith(tf, modelDefinitionPromise, warmupSizes, undefined, expect.any(Object));
    });

    it('is able to warmup with a patchSize array of warmup sizes', async () => {
      const modelDefinition: ModelDefinition = {
        path: 'foo',
        modelType: 'layers',
        scale: 2,
      };
      const modelDefinitionPromise = new Promise<{
        modelDefinition: ModelDefinition;
        model: LayersModel;
      }>(resolve => resolve({
        modelDefinition,
        model: 'foo' as unknown as LayersModel,
      }));
      vi.mocked(loadModel).mockImplementation(() => modelDefinitionPromise);
      vi.mocked(getModel).mockImplementation(async () => modelDefinition);
      vi.mocked(cancellableWarmup).mockImplementation(async () => { });
      const upscaler = new Upscaler();
      const warmupSizes: WarmupSizes = [{ patchSize: 32, padding: 2 }];
      await upscaler.warmup(warmupSizes);
      expect(cancellableWarmup).toBeCalledWith(tf, modelDefinitionPromise, warmupSizes, undefined, expect.any(Object));
    });

    it('is able to warmup with a numeric warmup size', async () => {
      const modelDefinition: ModelDefinition = {
        path: 'foo',
        modelType: 'layers',
        scale: 2,
      };
      const modelDefinitionPromise = new Promise<{
        modelDefinition: ModelDefinition;
        model: LayersModel;
      }>(resolve => resolve({
        modelDefinition,
        model: 'foo' as unknown as LayersModel,
      }));
      vi.mocked(loadModel).mockImplementation(() => modelDefinitionPromise);
      vi.mocked(getModel).mockImplementation(async () => modelDefinition);
      vi.mocked(cancellableWarmup).mockImplementation(async () => { });
      const upscaler = new Upscaler();
      const warmupSizes: WarmupSizes = [2, 2];
      await upscaler.warmup(warmupSizes);
      expect(cancellableWarmup).toBeCalledWith(tf, modelDefinitionPromise, warmupSizes, undefined, expect.any(Object));
    });

    it('is able to warmup with a patchSize warmup sizes', async () => {
      const modelDefinition: ModelDefinition = {
        path: 'foo',
        modelType: 'layers',
        scale: 2,
      };
      const modelDefinitionPromise = new Promise<{
        modelDefinition: ModelDefinition;
        model: LayersModel;
      }>(resolve => resolve({
        modelDefinition,
        model: 'foo' as unknown as LayersModel,
      }));
      vi.mocked(loadModel).mockImplementation(() => modelDefinitionPromise);
      vi.mocked(getModel).mockImplementation(async () => modelDefinition);
      vi.mocked(cancellableWarmup).mockImplementation(async (..._args: any[]) => { });
      const upscaler = new Upscaler();
      const warmupSizes: WarmupSizes = { patchSize: 32, padding: 2 };
      expect(cancellableWarmup).toHaveBeenCalledTimes(0);
      await upscaler.ready;
      expect(cancellableWarmup).toHaveBeenCalledTimes(1);
      await upscaler.warmup(warmupSizes);
      expect(cancellableWarmup).toHaveBeenCalledTimes(2);
      expect(cancellableWarmup).toBeCalledWith(tf, modelDefinitionPromise, warmupSizes, undefined, expect.any(Object));
    });
  });
});
