import { error, getLogLevel, info } from '@internals/common/logger';
import { ALL_MODEL_PACKAGE_DIRECTORY_NAMES } from '@internals/common/models';
import type { Bundler } from '@internals/bundlers';
import { buildUpscaler } from '../../commands/build/upscaler.js';
import { Environment, OutputFormat } from '@internals/common/types';
import { buildModels } from '../../commands/build/model.js';
import { getOutputFormatsForEnvironment } from './get-output-formats-for-environment.js';
import { startVitest } from 'vitest/node';
import { Registry, RegistryPackage } from '@internals/registry';
import { ROOT_BUNDLER_OUTPUT_DIR, getBundlerOutputDir } from './get-bundler-output-dir.js';
import { TFJSLibrary, getTFJSLibraryFromEnvironment } from '@internals/common/tfjs-library';
import { pluralize } from '@internals/common/pluralize';

const time = async (fn: () => Promise<unknown>, done: (duration: number) => void) => {
  const start = performance.now();
  await fn();
  done(performance.now() - start);
};

const getPackagesFromBundlers = async (bundlers: Bundler[]): Promise<RegistryPackage[]> => {
  const packageMap = new Map<string, RegistryPackage>();
  await Promise.all(bundlers.map(async (bundler) => {
    const packages = await bundler.packages;
    for (const pkg of packages) {
      packageMap.set(pkg.name, pkg);
    }
  }));
  const packages = Array.from(packageMap.values());
  if (packages.length === 0) {
    throw new Error('No packages found from bundlers')
  }
  return packages;
};

export const runTests = async (
  environment: Environment | Environment[],
  vitestConfigPath: string,
  bundlerDefinitions: (typeof Bundler)[],
  testFiles: string[],
  {
    'skip-upscaler-build': skipUpscalerBuild,
    'skip-model-build': skipModelBuild,
    'skip-bundle': skipBundle,
    'skip-test': skipTest,
    'use-gpu': useGPU,
    'use-tunnel': useTunnel,
    watch,
    'should-clear-dist-folder': shouldClearDistFolder,
  }: {
    'skip-upscaler-build'?: boolean;
    'skip-model-build'?: boolean;
    'skip-bundle'?: boolean;
    'skip-test'?: boolean;
    'use-gpu'?: boolean,
    'use-tunnel'?: boolean;
    watch?: boolean;
    'should-clear-dist-folder'?: boolean;
  }) => {
  const environments = ([] as Environment[]).concat(environment);
  const outputFormats = environments.reduce<OutputFormat[]>((arr, environment) => arr.concat(getOutputFormatsForEnvironment(environment)), []);
  const packageDirectoryNames = await ALL_MODEL_PACKAGE_DIRECTORY_NAMES;

  if (skipModelBuild !== true) {
    await time(() => buildModels(packageDirectoryNames, outputFormats, { shouldClearDistFolder }), duration => info([
      `** built models in ${Math.round(duration) / 1000} s`,
      ...packageDirectoryNames.map((modelPackage) => `  - ${modelPackage}`),
    ].join('\n')));
  } else {
    if (shouldClearDistFolder) {
      error('shouldClearDistFolder is true but skipModelBuild is true; this is a no-op')
    }
    info('-- Skipping model build');
  }

  if (skipUpscalerBuild !== true) {
    const tjfsLibraries = environments.map(getTFJSLibraryFromEnvironment).reduce<{
      tfjsLibrary: TFJSLibrary;
    }[]>((arr, tfjsLibraries) => arr.concat(tfjsLibraries.map(tfjsLibrary => ({
      tfjsLibrary,
    }))), []);
    await time(() => buildUpscaler(tjfsLibraries), duration => info([
      `** built upscaler: ${pluralize(environments, 'and')} in ${Math.round(duration) / 1000} s`,
    ].join('\n')));
  } else {
    info('-- Skipping UpscalerJS build');
  }

  process.env.ROOT_BUNDLER_OUTPUT_DIR = ROOT_BUNDLER_OUTPUT_DIR;
  if (skipBundle !== true) {
    info('Bundling');
    await time(async () => {
      const bundlers = bundlerDefinitions.map((Bundler) => new Bundler(getBundlerOutputDir(Bundler)));

      // const registry = new Registry(getPackagesFromBundlers(bundlers));
      // await registry.resetPackages();
      // await registry.start();
      // await registry.bootstrapPackages();
      try {
        for (const bundler of bundlers) {
          try {
            await bundler.bundle();
            // await bundler.bundle(registry.url);
          } catch (err) {
            error(`Bundler name: "${bundler.name}"`);
            throw err;
          }
        }
      } finally {
        // await registry.stop();
      }
    }, duration => info([
      `** bundled: ${environment} in ${Math.round(duration) / 1000} s`,
    ].join('\n')));
  } else {
    info('-- Skipping bundling step');
  }

  if (skipTest !== true) {
    process.env.useGPU = useGPU ? '1' : '0';
    process.env.useTunnel = useTunnel ? '1' : '0';
    process.env.logLevel = getLogLevel();
    process.env.watch = watch ? '1' : '0';

    const vitest = await startVitest('test', testFiles, {
      watch,
      config: vitestConfigPath,
    });

    process.on('exit', () => vitest?.close());
  }
};
