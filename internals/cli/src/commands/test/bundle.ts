import { Command, InvalidArgumentError } from '@commander-js/extra-typings';
import { output, verbose } from '@internals/common/logger';
import { BundleOptions, Bundler, BundlerName, isValidBundlerName } from '@internals/bundlers';
import { EsbuildBundler } from '@internals/bundlers/esbuild';
import { UMDBundler } from '@internals/bundlers/umd';
import { NodeBundler } from '@internals/bundlers/node';
import { Registry } from '@internals/registry';
import { getBundlerOutputDir } from '../../lib/utils/get-bundler-output-dir.js';
import { WebpackBundler } from '@internals/bundlers/webpack';

const bundlers: Record<BundlerName, typeof Bundler> = {
  esbuild: EsbuildBundler,
  webpack: WebpackBundler,
  node: NodeBundler,
  umd: UMDBundler,
};

export const bundle = async (bundlerName: BundlerName, {
  skipResetPackages,
  ...bundleOptions
}: {
  skipResetPackages: boolean;
} & BundleOptions): Promise<Bundler> => {
  verbose(`Bundling ${bundlerName}`);
  const Bundler = bundlers[bundlerName];
  const bundler = new Bundler(getBundlerOutputDir(Bundler));
  const registry = new Registry(bundler.packages);
  if (bundler.usesRegistry) {
    if (skipResetPackages !== true) {
      await registry.resetPackages();
    }
    await registry.start();
  }
  try {
    if (skipResetPackages !== true && bundler.usesRegistry) {
      await registry.bootstrapPackages();
    }
    await bundler.bundle(bundler.usesRegistry ? registry.url : undefined, bundleOptions);
  } finally {
    if (bundler.usesRegistry) {
      await registry.stop();
    }
  }
  verbose(`Bundled ${bundlerName}`);
  return bundler;
}

export default (program: Command) => program.command('bundle')
  .description('Run a bundling command')
  .argument('<string>', 'bundler')
  .option('-p, --skip-reset-packages', 'Skip the reset packages step', false)
  .option('-n, --skip-npm-install', 'Skip the NPM install', false)
  .option('-k, --keep-working-files', 'Keep the working files that are generated during bundling for later inspection', false)
  .action(async (bundlerName, { skipResetPackages, skipNpmInstall, keepWorkingFiles }) => {
    if (!isValidBundlerName(bundlerName)) {
      throw new Error(`Invalid bundler provided: ${bundlerName}`)
    }
    const start = performance.now();
    await bundle(bundlerName, { skipResetPackages, skipNpmInstall, keepWorkingFiles });
    // const duration = Math.round((performance.now() - start) / 100) * 10;
    const duration = ((performance.now() - start) / 1000).toFixed(2);
    output(`Bundled ${bundlerName} in ${duration}s`);
  });
