import { ModelDefinition, } from '@upscalerjs/core';
import getModelDefinition from './getModelDefinition';

const SCALE = 2;

const modelDefinition: ModelDefinition = getModelDefinition(SCALE, 'psnr-small');

export default modelDefinition;
