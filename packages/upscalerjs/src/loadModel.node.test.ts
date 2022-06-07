import {
  loadModel,
  getModelPath,
  getModuleFolder,
} from "./loadModel.node";
import * as tf from '@tensorflow/tfjs-node';
import path from 'path';
// import loadModel, {
// } from './loadModel.node';
// import * as models from './models';
// import { tf } from './dependencies.generated';
jest.mock('@tensorflow/tfjs-node');
import * as utils from './utils';
import { ModelDefinition } from "./types";
// jest.mock('./models');
// jest.mock('./dependencies.generated');
jest.mock('./utils', () => ({
  ...<typeof utils>(jest.requireActual('./utils')),
  getModuleFolder: jest.fn(),
  getModelDefinitionError: jest.fn(),
  isValidModelDefinition: jest.fn(),
  registerCustomLayers: jest.fn(),
}));
// jest.mock('./utils', () => {
//   const actualUtils = jest.requireActual('./utils');
//   return {
//     ...actualUtils,
//   };
// });


const mockedUtils = utils as jest.Mocked<typeof utils>;
const mockedTf = tf as jest.Mocked<typeof tf>;
    // (tf as any).loadLayersModel = jest.fn();

const getResolver = (fn: () => string) => (fn) as unknown as typeof require.resolve;

describe('getModuleFolder', () => {
  it('returns undefined if a module cannot be found', () => {
    const resolver = getResolver(() => '');
    expect(() => getModuleFolder('foo', resolver)).toThrow();
  });

  it('returns the path to the module if it is found', () => {
    const resolver = getResolver(() => './node_modules/baz');
    expect(getModuleFolder('baz', resolver)).toEqual('./node_modules/baz');
  });
});

describe('getModelPath', () => {
  it('returns model path if given no package information', () => {
    const resolver = getResolver(() => 'foo');
    expect(getModelPath({ path: 'foo', scale: 2 }, resolver)).toEqual('foo');
  });

  it('returns model path if given no package information', () => {
    const resolver = getResolver(() => './node_modules/baz');
    expect(getModelPath({ packageInformation: {
      name: 'baz',
      version: '1.0.0',
    }, path: 'some-model', scale: 2 }, resolver)).toEqual(`file://${path.resolve('./node_modules/baz', 'some-model')}`);
  });
});

describe('loadModel', () => {
  it('throws if given an undefined model definition', async () => {
    const resolver = getResolver(() => './node_modules/baz');
    const error = 'some error';
    mockedUtils.getModelDefinitionError.mockImplementation(() => new Error(error))
    mockedUtils.isValidModelDefinition.mockImplementation(() => false);

    await expect(loadModel(undefined, { resolver }))
    .rejects
    .toThrow(error);
  });

  it('loads a valid model', async () => {
    const resolver = getResolver(() => './node_modules/baz');
    mockedUtils.isValidModelDefinition.mockImplementation(() => true);
    mockedUtils.registerCustomLayers.mockImplementation(() => {});
    mockedTf.loadLayersModel.mockImplementation(async () => 'layers model' as any);

    const path = 'foo';
    const modelDefinition: ModelDefinition = { path, scale: 2};

    const response = await loadModel(modelDefinition, { resolver });
    expect(mockedUtils.registerCustomLayers).toHaveBeenCalledTimes(1);
    expect(mockedTf.loadLayersModel).toHaveBeenCalledWith(path);
    expect(response).toEqual({
      model: 'layers model',
      modelDefinition,
    })
  });

  // it('loads a model', () => {
  //   // (tf as any).loadLayersModel = jest.fn();
  //   // mockModels({
  //   //   default: {
  //   //     foo: {
  //   //       url: 'foo',
  //   //     },
  //   //   },
  //   //   DEFAULT_MODEL: 'foo',
  //   // });
  //   // loadModel({
  //   //   model: 'foo',
  //   // });
  //   // expect(tf.loadLayersModel).toHaveBeenCalledWith('foo');
  // });


});
