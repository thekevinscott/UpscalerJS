export type BundlerName = 'esbuild' | 'webpack' | 'umd' | 'node-cjs' | 'node-esm';
export const isValidBundlerName = (bundlerName: string): bundlerName is BundlerName => {
  return ['esbuild', 'webpack', 'umd', 'node-cjs', 'node-esm'].includes(bundlerName);
};
export type { Bundler, BundleOptions, } from './utils/Bundler.js';
import { EsbuildBundler, } from './bundlers/esbuild/src/EsbuildBundler.js';
import { NodeCJSBundler, } from './bundlers/node-cjs/src/NodeCJSBundler.js';
import { NodeESMBundler, } from './bundlers/node-esm/src/NodeESMBundler.js';
import { UMDBundler, } from './bundlers/umd/src/UMDBundler.js';
import { WebpackBundler, } from './bundlers/webpack/src/WebpackBundler.js';
import type { Bundler, } from './utils/Bundler.js';

class BundlerMap {
  byBundler = new Map<typeof Bundler, BundlerName>([
    [EsbuildBundler, 'esbuild',],
    [UMDBundler, 'umd',],
    [NodeCJSBundler, 'node-cjs',],
    [NodeESMBundler, 'node-esm',],
    [WebpackBundler, 'webpack',],
  ]);

  outputs = new Map<typeof Bundler, string>([
    [EsbuildBundler, 'esbuild'],
    [UMDBundler, 'umd'],
    [NodeCJSBundler, 'node/cjs'],
    [NodeESMBundler, 'node/esm'],
    [WebpackBundler, 'webpack'],
  ]);
  byName: Map<BundlerName, typeof Bundler>;

  constructor() {
    this.byName = new Map(Array.from(this.byBundler.entries()).map(([bundler, name,]) => [name, bundler,]));
  }

  getByName(name: BundlerName) {
    return this.byName.get(name);
  }
  getByBundler(bundler: typeof Bundler) {
    return this.byBundler.get(bundler);
  }
  getOutput(bundler: typeof Bundler) {
    return this.outputs.get(bundler);
  }
}

export const bundlers = new BundlerMap();
export { ROOT_BUNDLER_OUTPUT_DIR, getBundlerOutputDir, } from './utils/get-bundler-output-dir.js';
