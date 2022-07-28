import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve, } from '@rollup/plugin-node-resolve';
import type { InputOptions, OutputOptions, } from 'rollup';
import ESRGANSlim from '../../models/esrgan-slim/umd-names.json';

const isValidUMDNameFile = (contents: unknown): contents is {
   '.': string
} => typeof contents === 'object' && !!contents && '.' in contents;

const getESRGANUmdName = () => {
  if (isValidUMDNameFile(ESRGANSlim)) {
    return ESRGANSlim['.'];
  }
  throw new Error('Bad umd-names.json file for @upscalerjs/esrgan-slim');
};

export const inputOptions: InputOptions = {
  context: 'window',
  external: [
    '@tensorflow/tfjs',
    '@upscalerjs/esrgan-slim',
  ],
  plugins: [
    nodeResolve({
      preferBuiltins: true,
      resolveOnly: [
        /^(?!.*(@tensorflow\/tfjs))/,
      ],
    }),
    commonjs(),
  ],
};

export const outputOptions: OutputOptions = {
  format: 'umd',
  globals: {
    '@tensorflow/tfjs': 'tf',
    '@upscalerjs/esrgan-slim': getESRGANUmdName(),
  },
};
