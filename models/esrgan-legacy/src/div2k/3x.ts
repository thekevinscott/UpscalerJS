import { ModelDefinition, } from '@upscalerjs/core';
import _getModelDefinitionDEPRECATED from '../utils/getModelDefinitionDeprecated';

const SCALE = 3;

const modelDefinition: ModelDefinition = _getModelDefinitionDEPRECATED(SCALE, `div2k/${SCALE}x`);

export default modelDefinition;
