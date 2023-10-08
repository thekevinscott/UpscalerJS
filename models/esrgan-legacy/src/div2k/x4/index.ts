import { ModelDefinition, } from '@upscalerjs/core';
import getModelDefinition from '../../getModelDefinition';

const SCALE = 4;

const modelDefinition: ModelDefinition = getModelDefinition(SCALE, `div2k/x${SCALE}`);

export default modelDefinition;
