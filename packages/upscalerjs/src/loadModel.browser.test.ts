import type { io } from '@tensorflow/tfjs';
import { tf, } from './dependencies.generated';
import {
  CDNS,
  fetchModel,
  getLoadModelErrorMessage,
  // loadModel,
} from './loadModel.browser';

jest.mock('./dependencies.generated', () => {
  const dependencies = jest.requireActual('./dependencies.generated');
  return {
    ...dependencies,
    tf: {
      ...dependencies.tf,
      loadLayersModel: jest.fn(),
    }
  }
});

const mockedTf = tf as jest.Mocked<typeof tf>;

describe('fetchModel', () => {
  beforeEach(() => {
    mockedTf.loadLayersModel.mockClear();
  });

  it('loads the given model path if there is no package info', async () => {
    expect(mockedTf.loadLayersModel).toBeCalledTimes(0);
    await fetchModel('foo');
    expect(mockedTf.loadLayersModel).toBeCalledTimes(1);
    expect(mockedTf.loadLayersModel).toBeCalledWith('foo');
  });

  it('attempts to load a model from a CDN if given package information', async () => {
    const packageName = 'packageName';
    const version = 'version';
    const modelPath = 'modelPath';
    expect(mockedTf.loadLayersModel).toBeCalledTimes(0);
    await fetchModel(modelPath, {
      name: packageName,
      version,
    });
    expect(mockedTf.loadLayersModel).toBeCalledTimes(1);
    expect(mockedTf.loadLayersModel).toBeCalledWith(CDNS[0].fn(packageName, version, modelPath));
  });

  it('attempts to load a model from a subsequent CDN if a prior one fails', async () => {
    const packageName = 'packageName';
    const version = 'version';
    const modelPath = 'modelPath';
    mockedTf.loadLayersModel.mockImplementation(async (url: string | io.IOHandler) => {
      if (url === CDNS[0].fn(packageName, version, modelPath)) {
        throw new Error('next');
      }
      return 'foo' as unknown as tf.LayersModel;
    });
    expect(mockedTf.loadLayersModel).toBeCalledTimes(0);
    await fetchModel(modelPath, {
      name: packageName,
      version,
    });
    expect(mockedTf.loadLayersModel).toBeCalledTimes(2);
    expect(mockedTf.loadLayersModel).toBeCalledWith(CDNS[1].fn(packageName, version, modelPath));
  });

  it('throws if all attempts to fetch a model fail', async () => {
    const packageName = 'packageName';
    const version = 'version';
    const modelPath = 'modelPath';
    mockedTf.loadLayersModel.mockImplementation(async () => {
      throw new Error('next');
    });
    await expect(() => fetchModel(modelPath, {
      name: packageName,
      version,
    }))
    .rejects
    .toThrowError(getLoadModelErrorMessage(modelPath));
  });
});
