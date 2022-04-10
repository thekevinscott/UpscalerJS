// import { tf, } from './dependencies.generated';
import path from 'path';
import { ModelDefinition } from "./types";

const url = path.join(__dirname, '../../models/2x-3/model.json');

const modelDefinition: ModelDefinition = {
  scale: 4,
  channels: 3,
  url,
  meta: {
    dataset: null,
    name: 'normal',
  },
};

export default modelDefinition;
