#!/usr/bin/env node

import { verbose, } from '@internals/common/logger';
import { BundleOptions, Bundler, BundlerName, isValidBundlerName, } from '@internals/bundlers';
import { EsbuildBundler, } from '@internals/bundlers/esbuild';
import { UMDBundler, } from '@internals/bundlers/umd';
import { NodeBundler, } from '@internals/bundlers/node';
import { WebpackBundler, } from '@internals/bundlers/webpack';
import { getBundlerOutputDir, } from '../utils/get-bundler-output-dir.js';

const bundlers: Record<BundlerName, typeof Bundler> = {
  esbuild: EsbuildBundler,
  webpack: WebpackBundler,
  node: NodeBundler,
  umd: UMDBundler,
};

export const runBundle = async (bundlerName: BundlerName, {
  ...bundleOptions
}: BundleOptions = {}): Promise<Bundler> => {
  console.info(`Bundling ${bundlerName}`);
  const Bundler = bundlers[bundlerName];
  const bundler = new Bundler(getBundlerOutputDir(Bundler));
  await bundler.bundle(bundleOptions);
  return bundler;
};

const bundlerName = process.argv.pop();
if (bundlerName === undefined) {
  throw new Error('You must provide a bundler name')
}
if (!isValidBundlerName(bundlerName)) {
  throw new Error(`Invalid bundler provided: ${bundlerName}`)
}
const start = performance.now();
await runBundle(bundlerName);
// const duration = Math.round((performance.now() - start) / 100) * 10;
const duration = ((performance.now() - start) / 1000).toFixed(2);
console.log(`Bundled ${bundlerName} in ${duration}s`);
