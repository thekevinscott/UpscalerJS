import { ModelDefinitionFn, } from '@upscalerjs/core';
import getModelDefinition from './getModelDefinition';

const SCALE = 2;

const modelDefinition: ModelDefinitionFn = getModelDefinition(SCALE, 'psnr-small');

export default modelDefinition;
