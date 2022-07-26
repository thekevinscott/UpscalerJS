import { Upscaler } from './upscaler';
import type { LayersModel } from '@tensorflow/tfjs';
import * as loadModel from './loadModel.generated';
import * as warmup from './warmup';
import * as upscale from './upscale';
import { WarmupSizes } from './types';
import { ModelDefinition } from '@upscalerjs/core';
jest.mock('./upscale', () => ({
  ...(jest.requireActual('./upscale') as typeof upscale),
}));
jest.mock('./loadModel.generated');
jest.mock('./warmup');
jest.mock('./dependencies.generated', () => ({
  tf: {},
  ESRGANSlim: {},
}));

const mockedUpscale = upscale as jest.Mocked<typeof upscale>;
const mockedLoadModel = loadModel as jest.Mocked<typeof loadModel>;
const mockedWarmup = warmup as jest.Mocked<typeof warmup>;

describe('Upscaler', () => {
  beforeEach(() => {
    [
      mockedLoadModel.loadModel,
      (mockedUpscale as any).default.cancellableUpscale,
      mockedWarmup.default,
    ].forEach(fn => {
      try {
        fn.mockClear();
      } catch(err) {}
    });
  });

  it('is able to abort multiple times', (): Promise<void> => new Promise(async (resolve, reject) => {
    mockedLoadModel.loadModel.mockImplementation(async () => {
      return {
        modelDefinition: {
          path: 'foo',
          scale: 2,
        },
        model: 'foo' as any,
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
    (mockedUpscale as any).default.cancellableUpscale = cancellableUpscale;

    const upscaler = new Upscaler();
    upscaler.upscale('foo');
    await tick();
    upscaler.upscale('foo');
    await tick();
    upscaler.upscale('foo');
    await tick();
  }), 100);

  it('is able to warmup', async () => {
    mockedWarmup.default = jest.fn();
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
    mockedLoadModel.loadModel.mockImplementation(() => modelDefinitionPromise);
    const upscaler = new Upscaler();
    const warmupSizes: WarmupSizes[] = [[2,2]];
    await upscaler.warmup(warmupSizes);
    expect(mockedWarmup.default).toBeCalledWith(modelDefinitionPromise, warmupSizes);
  });
});
