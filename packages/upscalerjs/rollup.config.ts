import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve, } from '@rollup/plugin-node-resolve';
import type { InputOptions, OutputOptions, } from 'rollup';

export const inputOptions: InputOptions = {
  context: 'window',
  external: [
    '@tensorflow/tfjs',
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
  },
};
