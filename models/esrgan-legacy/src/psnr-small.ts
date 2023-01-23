import { ModelDefinition, } from '@upscalerjs/core';
import getModelDefinition from './utils/getModelDefinition';

const SCALE = 2;

const modelDefinition: ModelDefinition = getModelDefinition(SCALE, 'psnr-small');

export default modelDefinition;
