import { ModelDefinitionFn, } from '@upscalerjs/core';
import { clipOutput, } from '../utils/clipOutput';
import getModelDefinition from '../utils/getModelDefinition';

const SCALE = 4;

const modelDefinition: ModelDefinitionFn = tf => getModelDefinition(SCALE, `div2k/${SCALE}x`, clipOutput(tf));

export default modelDefinition;
