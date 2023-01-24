import { ModelDefinition, } from '@upscalerjs/core';
import getModelDefinition from '../utils/getModelDefinition';

const SCALE = 3;

const modelDefinition: ModelDefinition = getModelDefinition(SCALE, `div2k/${SCALE}x`);

export default modelDefinition;
