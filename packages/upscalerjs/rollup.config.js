import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: "dist/tmp/umd.js",
  output: {
    file: "dist/umd/upscaler.js",
    format: 'umd',
    name: 'Upscaler',
    globals: {
      '@tensorflow/tfjs': 'tf',
    }
  },
  context: 'window',
  external: ['@tensorflow/tfjs'],
  plugins: [
    nodeResolve({
      resolveOnly: [
        /^(?!.*(@tensorflow\/tfjs))/,
      ],
    }),
    commonjs(),
  ]
};
