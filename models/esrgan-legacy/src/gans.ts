import { ModelDefinitionFn, } from '@upscalerjs/core';
import getModelDefinition from './getModelDefinition';

const SCALE = 4;

const modelDefinition: ModelDefinitionFn = getModelDefinition(SCALE, 'gans', 'rrdn');

export default modelDefinition;
