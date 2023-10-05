const commonjs = require('@rollup/plugin-commonjs');
const rollupJSON = require('@rollup/plugin-json');
const { nodeResolve, } = require('@rollup/plugin-node-resolve');

module.exports = {
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
