import getModelDefinition from '../utils/getModelDefinition';

const SCALE = 3;

const modelDefinition = getModelDefinition(SCALE, `div2k/${SCALE}x`, {
  outputRange: [0, 1,],
  inputRange: [0, 1,],
});

export default modelDefinition;
