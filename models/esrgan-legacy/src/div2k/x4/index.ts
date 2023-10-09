import type { ModelDefinition, } from '../../../../../packages/shared/src/types';
import getModelDefinition from '../../getModelDefinition';

const SCALE = 4;

const modelDefinition: ModelDefinition = getModelDefinition(SCALE, `div2k/x${SCALE}`);

export default modelDefinition;
