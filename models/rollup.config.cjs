const commonjs = require('@rollup/plugin-commonjs');
const rollupJSON = require('@rollup/plugin-json');
const { nodeResolve, } = require('@rollup/plugin-node-resolve');

module.exports = {
  input: [
    'dist/umd-tmp/umd.js',
    'dist/umd-tmp/2x/umd.js',
    'dist/umd-tmp/3x/umd.js',
    'dist/umd-tmp/4x/umd.js',
  ],
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
    rollupJSON(),
  ],
};
