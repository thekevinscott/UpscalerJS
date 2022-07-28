import { Upscaler } from './upscaler';
import type { LayersModel } from '@tensorflow/tfjs';
import { loadModel as _loadModel, } from './loadModel.generated';
import { warmup as _warmup, } from './warmup';
import { cancellableUpscale as _cancellableUpscale, } from './upscale';
import { WarmupSizes } from './types';
import { ModelDefinition } from '@upscalerjs/core';
import { mockFn } from '../../../test/lib/shared/mockers';
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
  const { warmup, ...rest } = jest.requireActual('./warmup');
  return {
    ...rest,
    warmup: jest.fn(warmup),
  };
});
jest.mock('./dependencies.generated', () => {
  const dependencies = jest.requireActual('./dependencies.generated');
  return {
    ...dependencies,
  };
});

const cancellableUpscale = mockFn(_cancellableUpscale);
const warmup = mockFn(_warmup);
const loadModel = mockFn(_loadModel);

describe('Upscaler', () => {
  beforeEach(() => {
    cancellableUpscale.mockClear();
    warmup.mockClear();
    loadModel.mockClear();
  });

  it('is able to abort multiple times', (): Promise<void> => new Promise(async (resolve, reject) => {
    loadModel.mockImplementation(async () => {
      return {
        modelDefinition: {
          path: 'foo',
          scale: 2,
        },
        model: 'foo' as unknown as LayersModel,
      };
    });

    const tick = () => new Promise(resolve => setTimeout(resolve));
    let count = 0;
    const cancellableUpscale = jest.fn(async function (_1, _2, { signal }: {
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
    cancellableUpscale.mockImplementation(cancellableUpscale)

    const upscaler = new Upscaler();
    upscaler.upscale('foo');
    await tick();
    upscaler.upscale('foo');
    await tick();
    upscaler.upscale('foo');
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
        scale: 2,
      },
      model: mockModel as unknown as LayersModel,
    }));
    const upscaler = new Upscaler();
    await upscaler.dispose();
    expect(dispose).toHaveBeenCalled();

  });

  it('is able to warmup', async () => {
    const modelDefinitionPromise = new Promise<{
      modelDefinition: ModelDefinition;
      model: LayersModel;
    }>(resolve => resolve({
      modelDefinition: {
        path: 'foo',
        scale: 2,
      },
      model: 'foo' as unknown as LayersModel,
    }));
    loadModel.mockImplementation(() => modelDefinitionPromise);
    warmup.mockImplementation(async () => {});
    const upscaler = new Upscaler();
    const warmupSizes: WarmupSizes[] = [[2,2]];
    await upscaler.warmup(warmupSizes);
    expect(warmup).toBeCalledWith(modelDefinitionPromise, warmupSizes);
  });
});
