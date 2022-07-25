import { ModelDefinitionFn, } from '@upscalerjs/core';
import { clipOutput, } from '../utils/clipOutput';
import getModelDefinition from '../utils/getModelDefinition';

const modelDefinition: ModelDefinitionFn = tf => getModelDefinition(2, 'div2k/2x', clipOutput(tf));

export default modelDefinition;
