import commonjs from '@rollup/plugin-commonjs';
import ts from "rollup-plugin-ts";
import { nodeResolve, } from '@rollup/plugin-node-resolve';

export default {
  external: [
    '@tensorflow/tfjs',
    '@tensorflow/tfjs-node',
    '@tensorflow/tfjs-node-gpu',
  ],
  input: './dist/cjs-tmp/models/default-model/src/index.js',
  output: {
    file: './dist/cjs/index.cjs',
    format: 'cjs',
  },
  plugins: [
    nodeResolve({
      preferBuiltins: true,
      resolveOnly: [
        /^(?!.*(@tensorflow\/tfjs))/,
      ],
    }),
    commonjs(),
    ts({
      include: ["./dist/cjs-tmp/**/*.*"],
      // exclude: ["./dist/cjs/**/*", "./src/**/*"],
      tsconfig: {
        // "module": "Node16",
        // "moduleResolution": "Node16"
      },
      // './tsconfig.cjs.json',
    })
  ],
};

