import { 
  loadModel,
  getModelPath,
  getModuleFolder,
  getMissingMatchesError,
} from "./loadModel.node";
import * as tf from '@tensorflow/tfjs-node';
import path from 'path';
jest.mock('@tensorflow/tfjs-node');
import * as utils from './utils';
import * as resolver from './resolver';
import type { ModelDefinition } from "@upscalerjs/core";
jest.mock('./utils', () => {
  const actualUtils: typeof utils = jest.requireActual('./utils');
  return {
    ...actualUtils,
    getModuleFolder: jest.fn(),
    getModelDefinitionError: jest.fn(),
    isValidModelDefinition: jest.fn(),
    registerCustomLayers: jest.fn(),
  }
});
jest.mock('./resolver', () => ({
  resolver: jest.fn(),
}));

const mockedUtils = utils as jest.Mocked<typeof utils>;
const mockedTf = tf as jest.Mocked<typeof tf>;
const mockedResoler = resolver as jest.Mocked<typeof resolver>;

const getResolver = (fn: () => string) => (fn) as unknown as typeof require.resolve;

describe('getModuleFolder', () => {
  it('returns undefined if a module cannot be found', () => {
    mockedResoler.resolver.mockImplementation(getResolver(() => 'foo'));
    expect(() => getModuleFolder('foo')).toThrowError(getMissingMatchesError('foo'));
  });

  it('returns the path to the module', () => {
    mockedResoler.resolver.mockImplementation(getResolver(() => './node_modules/@upscalerjs/esrgan-slim/dist/foo/foo.ts'));
    expect(getModuleFolder('baz')).toEqual('./node_modules/@upscalerjs/esrgan-slim/');
  });

  it('returns the path to the module even if it is local', () => {
    mockedResoler.resolver.mockImplementation(getResolver(() => '/Users/foo/@upscalerjs/esrgan-slim/dist/foo/foo.ts'));
    expect(getModuleFolder('baz')).toEqual('/Users/foo/@upscalerjs/esrgan-slim/');
  });

  it('returns the path to the module even if the name is different', () => {
    mockedResoler.resolver.mockImplementation(getResolver(() => '/dist/Users/foo/baz/dist/foo/foo.ts'));
    expect(getModuleFolder('baz')).toEqual('/dist/Users/foo/baz/');
  });
});

describe('getModelPath', () => {
  it('returns model path if given no package information', () => {
    mockedResoler.resolver.mockImplementation(getResolver(() => ''));
    expect(getModelPath({ path: 'foo', scale: 2 })).toEqual('foo');
  });

  it('returns model path if given package information', () => {
    mockedResoler.resolver.mockImplementation(getResolver(() => './node_modules/@upscalerjs/esrgan-slim/dist/foo/foo.ts'));
    expect(getModelPath({ packageInformation: {
      name: 'baz',
      version: '1.0.0',
    }, path: 'some-model', scale: 2 })).toEqual(`file://${path.resolve('./node_modules/@upscalerjs/esrgan-slim', 'some-model')}`);
  });
});

describe('loadModel', () => {
  it('throws if given an undefined model definition', async () => {
    mockedResoler.resolver.mockImplementation(getResolver(() => './node_modules/baz'));
    const error = 'some error';
    mockedUtils.getModelDefinitionError.mockImplementation(() => new Error(error))
    mockedUtils.isValidModelDefinition.mockImplementation(() => false);

    await expect(loadModel({} as ModelDefinition))
    .rejects
    .toThrow(error);
  });

  it('loads a valid model', async () => {
    mockedResoler.resolver.mockImplementation(getResolver(() => './node_modules/baz'));
    mockedUtils.isValidModelDefinition.mockImplementation(() => true);
    mockedUtils.registerCustomLayers.mockImplementation(() => {});
    mockedTf.loadLayersModel.mockImplementation(async () => 'layers model' as any);

    const path = 'foo';
    const modelDefinition: ModelDefinition = { path, scale: 2};

    const response = await loadModel(modelDefinition);
    expect(mockedUtils.registerCustomLayers).toHaveBeenCalledTimes(1);
    expect(mockedTf.loadLayersModel).toHaveBeenCalledWith(path);
    expect(response).toEqual({
      model: 'layers model',
      modelDefinition,
    })
  });
});
