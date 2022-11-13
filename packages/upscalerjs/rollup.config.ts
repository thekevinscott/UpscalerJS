import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve, } from '@rollup/plugin-node-resolve';
import type { InputOptions, OutputOptions, } from 'rollup';
import ESRGANSlim from '../../models/default/umd-names.json';

const isValidUMDNameFile = (contents: unknown): contents is {
   '.': string
} => typeof contents === 'object' && contents !== undefined && contents !== null && '.' in contents;

const getESRGANUmdName = () => {
  if (isValidUMDNameFile(ESRGANSlim)) {
    return ESRGANSlim['.'];
  }
  throw new Error('Bad umd-names.json file for @upscalerjs/default-model');
};

export const inputOptions: InputOptions = {
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
      ],
    }),
    commonjs(),
  ],
};

export const outputOptions: OutputOptions = {
  format: 'umd',
  globals: {
    '@tensorflow/tfjs': 'tf',
    '@upscalerjs/default-model': getESRGANUmdName(),
  },
};
