import {Args, Flags} from '@oclif/core';
import { output, verbose } from '@internals/common/logger';
import { BundleOptions, Bundler, BundlerName, isValidBundlerName } from '@internals/bundlers';
import { EsbuildBundler } from '@internals/bundlers/esbuild';
import { UMDBundler } from '@internals/bundlers/umd';
import { NodeBundler } from '@internals/bundlers/node';
import { Registry } from '@internals/registry';
import { WebpackBundler } from '@internals/bundlers/webpack';
import { getBundlerOutputDir } from '../../lib/utils/get-bundler-output-dir.js';
import { BaseCommand } from '../../lib/utils/base-command.js';

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

export default class Bundle extends BaseCommand<typeof Bundle> {
  static description = 'Run a bundling command'

  static args = {
    bundlerName: Args.string({required: true, description: 'Bundler to use'}),
  }

  static flags = {
    skipResetPackages: Flags.boolean({ char: 'p', description: 'Skip the reset packages step', default: false }),
    skipNpmInstall: Flags.boolean({ char: 'n', description: 'Skip the NPM install', default: false }),
    keepWorkingFiles: Flags.boolean({ char: 'k', description: 'Keep the working files that are generated during bundling for later inspection', default: false }),
  }

  async run(): Promise<void> {
    const { args: { bundlerName }, flags: { skipResetPackages, skipNpmInstall, keepWorkingFiles } } = await this.parse(Bundle);
    if (!isValidBundlerName(bundlerName)) {
      throw new Error(`Invalid bundler provided: ${bundlerName}`)
    }
    const start = performance.now();
    await bundle(bundlerName, { skipResetPackages, skipNpmInstall, keepWorkingFiles });
    // const duration = Math.round((performance.now() - start) / 100) * 10;
    const duration = ((performance.now() - start) / 1000).toFixed(2);
    output(`Bundled ${bundlerName} in ${duration}s`);
  }
}
