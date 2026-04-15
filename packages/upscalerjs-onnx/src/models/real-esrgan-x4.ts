/**
 * Sample ONNX ModelDefinition — Real-ESRGAN x4 (General).
 *
 * Real-ESRGAN is the closest analogue to UpscalerJS's `esrgan-*` model
 * family: same GAN-based super-resolution lineage, widely deployed, and
 * has publicly-available ONNX exports (e.g. those shipped by xinntao's
 * Real-ESRGAN repo and on Hugging Face).
 *
 * This file demonstrates what a model package looks like in the ONNX world
 * compared with, e.g. `/models/esrgan-thick/src/x4/index.ts`:
 *
 *   - single `.onnx` file in `path` (not `model.json` + shards)
 *   - declares layout (most Real-ESRGAN exports are NCHW)
 *   - `inputRange` / `outputRange` declared in `[0, 1]` instead of `[0, 255]`
 *     because the export normalises internally
 */
import type { ModelDefinition, } from '../shared/types';

const realEsrganX4: ModelDefinition = {
  modelType: 'onnx',
  scale: 4,
  channels: 3,
  layout: 'nchw',
  inputRange: [0, 1,],
  outputRange: [0, 1,],
  // Real-ESRGAN's public ONNX exports are typically trained on 64-divisible
  // tiles. UpscalerJS's patch logic already handles this correctly via the
  // `divisibilityFactor` hint.
  divisibilityFactor: 4,
  _internals: {
    name: '@upscalerjs/real-esrgan-x4-onnx',
    version: '0.0.0-spike.0',
    path: 'models/real-esrgan-x4.onnx',
  },
  meta: {
    architecture: 'RRDBNet',
    paper: 'https://arxiv.org/abs/2107.10833',
    license: 'BSD-3-Clause',
  },
};

export default realEsrganX4;
