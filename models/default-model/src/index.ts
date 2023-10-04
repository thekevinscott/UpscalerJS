import { ModelDefinition, } from '@upscalerjs/core';
import { getESRGANModelDefinition, } from '../../../packages/shared/src/esrgan/esrgan';
import packageJSON from '../package.json';

const SCALE = 2;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const getValue = (packageJSON: unknown, key: string): string => {
  if (!isObject(packageJSON)) {
    throw new Error('Invalid package json provided');
  }
  const value = packageJSON[key];
  if (typeof value !== 'string') {
    throw new Error(`value is not a string`);
  }
  return value;
};

const modelDefinition: ModelDefinition = getESRGANModelDefinition({
  scale: SCALE,
  name: getValue(packageJSON, 'name'),
  version: getValue(packageJSON, 'version'),
  path: 'models/model.json',
  meta: {
    C: 1,
    D: 2,
    G: 4,
    G0: 64,
    T: 10,
    architecture: "rdn",
    patchSize: 128,
    size: 'slim',
    artifactReducing: false,
    sharpening: false,
    dataset: 'div2k',
    modelFileName: 'rdn-C1-D2-G4-G064-T10-x2-patchsize128-compress100-sharpen0-datadiv2k-vary_cFalse_best-val_loss_epoch494',
  },
});

export default modelDefinition;
