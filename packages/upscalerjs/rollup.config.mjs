import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve, } from '@rollup/plugin-node-resolve';
import DefaultUpscalerModel from '../../models/default-model/umd-names.json' assert { type: 'json' };

const isValidUMDNameFile = (contents)  => typeof contents === 'object' && contents !== undefined && contents !== null && '.' in contents;

const getModelUmdName = () => {
  if (isValidUMDNameFile(DefaultUpscalerModel)) {
    return DefaultUpscalerModel['.'];
  }
  throw new Error('Bad umd-names.json file for @upscalerjs/default-model');
};

export default {
  context: 'window',
  external: [
    '@tensorflow/tfjs',
    '@upscalerjs/default-model',
  ],
  plugins: [
    nodeResolve({
      preferBuiltins: true,
      resolveOnly: [
        /^(?!.*(@tensorflow\/tfjs))/, //skipcq: js-0113
        /^(?!.*(@tensorflow\/tfjs-core))/, //skipcq: js-0113
      ],
    }),
    commonjs(),
  ],
  output: {
    globals: {
      '@tensorflow/tfjs': 'tf',
      '@tensorflow/tfjs-core': 'tf',
      '@upscalerjs/default-model': getModelUmdName(),
    },
  },
};
