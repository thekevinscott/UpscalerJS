// This file is extended via build-model.ts
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve, } from '@rollup/plugin-node-resolve';
import type { InputOptions, } from 'rollup';

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
