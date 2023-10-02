import path from 'path';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve, } from '@rollup/plugin-node-resolve';
// import type { InputOptions, OutputOptions, } from 'rollup';
import DefaultUpscalerModel from '../../models/default-model/umd-names.json' assert { type: 'json' };
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// const isValidUMDNameFile = (contents: unknown): contents is {
//    '.': string
// } => typeof contents === 'object' && contents !== undefined && contents !== null && '.' in contents;
const isValidUMDNameFile = (contents)  => typeof contents === 'object' && contents !== undefined && contents !== null && '.' in contents;

const getModelUmdName = () => {
  if (isValidUMDNameFile(DefaultUpscalerModel)) {
    return DefaultUpscalerModel['.'];
  }
  throw new Error('Bad umd-names.json file for @upscalerjs/default-model');
};

export const inputOptions = {
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
};

export const outputOptions = {
  // format: 'umd',
  globals: {
    '@tensorflow/tfjs': 'tf',
    '@tensorflow/tfjs-core': 'tf',
    '@upscalerjs/default-model': getModelUmdName(),
  },
};

export default {
  ...inputOptions,
	output: outputOptions,
  // {
  //   ...outputOptions,
  //   // file: path.resolve(__dirname, './dist/browser/umd/upscaler.js'),
  //   // name: 'Upscaler',
  // },
};
