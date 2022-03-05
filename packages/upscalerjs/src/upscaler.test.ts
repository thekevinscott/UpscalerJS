import { Upscaler } from './upscaler';
import * as loadModel from './loadModel';
import './warmup';
import * as upscale from './upscale';
jest.mock('./upscale', () => ({
  ...jest.requireActual('./upscale'),
}));
jest.mock('./loadModel');
jest.mock('./warmup');

const mockedUpscale = upscale as jest.Mocked<typeof upscale>;
const mockedLoadModel = loadModel as jest.Mocked<typeof loadModel>;
(mockedLoadModel as any).default = async() => () => ({});

describe('Upscaler', () => {
  it('is able to abort multiple times', () => new Promise(async (resolve, reject) => {
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
