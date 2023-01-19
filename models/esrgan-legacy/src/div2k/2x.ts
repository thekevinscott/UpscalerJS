import getModelDefinition from '../utils/getModelDefinition';

const SCALE = 2;

export default getModelDefinition(SCALE, `div2k/${SCALE}x`, {
  outputRange: [0, 1,],
  inputRange: [0, 1,],
});
