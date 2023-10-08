import type { ModelDefinition, } from '../../../../../packages/shared/src/types';
import getModelDefinition from '../../getModelDefinition';

const SCALE = 3;

const modelDefinition: ModelDefinition = getModelDefinition(SCALE, `div2k/x${SCALE}`);

export default modelDefinition;
