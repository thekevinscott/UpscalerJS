// import { ModelDefinition, } from '@upscalerjs/core';
// import _getModelDefinitionDEPRECATED from '../utils/getModelDefinitionDeprecated';

// const SCALE = 2;

// const modelDefinition: ModelDefinition = _getModelDefinitionDEPRECATED(SCALE, `div2k/${SCALE}x`);

// export default modelDefinition;

import { ModelDefinitionFn, } from '@upscalerjs/core';
import getModelDefinition from '../getModelDefinition';

const SCALE = 2;

const modelDefinition: ModelDefinitionFn = getModelDefinition(SCALE, `div2k/${SCALE}x`);

export default modelDefinition;
