import getModelDefinition from '../utils/getModelDefinition';

const SCALE = 4;

export default getModelDefinition(SCALE, `div2k/${SCALE}x`, {
  outputRange: [0, 1,],
});
