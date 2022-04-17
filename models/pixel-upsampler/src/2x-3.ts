// import { tf, } from './dependencies.generated';
import {ModelDefinition} from 'upscaler/types';
import { NAME, VERSION } from './constants.generated';
// import { name, version } from '../package.json';
// import { getPath } from './path.generated';

const modelDefinition: ModelDefinition = {
  scale: 2,
  channels: 3,
  path: 'models/model.json',
  packageInformation: {
    name: NAME,
    version: VERSION,
  },
  meta: {
    dataset: null,
    name: 'normal',
  },
};

export default modelDefinition;
