export type BundlerName = 'esbuild' | 'webpack' | 'umd' | 'node';
export const isValidBundlerName = (bundlerName: string): bundlerName is BundlerName => {
  return ['esbuild', 'webpack', 'umd', 'node'].includes(bundlerName);
};
export type { Bundler, BundleOptions } from './utils/Bundler.js';
import { EsbuildBundler } from './bundlers/esbuild/src/EsbuildBundler.js';
import { NodeBundler } from './bundlers/node/src/NodeBundler.js';
import { UMDBundler } from './bundlers/umd/src/UMDBundler.js';
import { WebpackBundler } from './bundlers/webpack/src/WebpackBundler.js';
import type { Bundler } from './utils/Bundler.js';


class BundlerMap {
  byBundler = new Map<typeof Bundler, BundlerName>([
    [EsbuildBundler, 'esbuild'],
    [UMDBundler, 'umd'],
    [NodeBundler, 'node'],
    [WebpackBundler, 'webpack'],
  ]);
  byName: Map<BundlerName, typeof Bundler>;

  constructor() {
    this.byName = new Map(Array.from(this.byBundler.entries()).map(([bundler, name]) => [name, bundler]));
  }

  getByName(name: BundlerName) {
    return this.byName.get(name);
  }
  getByBundler(bundler: typeof Bundler) {
    return this.byBundler.get(bundler);
  }
}

export const bundlers = new BundlerMap();
