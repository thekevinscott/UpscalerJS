import { Upscaler } from './upscaler';
import * as loadModel from './loadModel.generated';
import './warmup';
import * as upscale from './upscale';
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
mockedLoadModel.loadModel.mockImplementation(async () => {
  return {
    modelDefinition: {
      path: 'foo',
      scale: 2,
    },
    model: 'foo' as any,
  };
});

describe('Upscaler', () => {
  it('is able to abort multiple times', (): Promise<void> => new Promise(async (resolve, reject) => {
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
});
