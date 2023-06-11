import { ModelDefinitionFn, } from '@upscalerjs/core';
import getModelDefinition from '../getModelDefinition';

const SCALE = 4;

const modelDefinition: ModelDefinitionFn = getModelDefinition(SCALE, `div2k/${SCALE}x`);

export default modelDefinition;
