import { ModelDefinitionFn, } from '@upscalerjs/core';
import { clipOutput, } from './utils/clipOutput';
import getModelDefinition from './utils/getModelDefinition';

const SCALE = 2;

const modelDefinition: ModelDefinitionFn = tf => getModelDefinition(SCALE, 'psnr-small', clipOutput(tf));

export default modelDefinition;
