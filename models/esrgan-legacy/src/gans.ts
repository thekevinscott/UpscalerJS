import { ModelDefinitionFn, } from '@upscalerjs/core';
import getModelDefinition from './getModelDefinition';

const SCALE = 2;

const modelDefinition: ModelDefinitionFn = getModelDefinition(SCALE, 'gans', 'rrdn');

export default modelDefinition;
