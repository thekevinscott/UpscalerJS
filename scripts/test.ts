/*****
 * Script for wrapping and running integration tests for Browser and Node
 */

import path from 'path';
import { spawn } from 'child_process';
import yargs from 'yargs';
import { sync } from 'glob';
import buildModels from '../scripts/package-scripts/build-model';
import { getAllAvailableModelPackages } from './package-scripts/utils/getAllAvailableModels';
import { OutputFormat } from './package-scripts/prompt/types';
import { ifDefined as _ifDefined } from './package-scripts/prompt/ifDefined';
import buildUpscaler from './package-scripts/build-upscaler';
import { Browserstack, getBrowserstackAccessKey, startBrowserstack, stopBrowserstack } from './package-scripts/utils/browserStack';
import { DEFAULT_OUTPUT_FORMATS } from './package-scripts/prompt/getOutputFormats';
import { TEST_DIR } from './package-scripts/utils/constants';
import { Bundle } from '../test/integration/utils/NodeTestRunner';
/****
 * Types
 */
type Platform = 'browser' | 'node';
type Runner = 'local' | 'browserstack';

/****
 * Utility Functions & Classes
 */

const getOutputFormats = (target: Platform): Array<OutputFormat> => {
  if (target === 'browser') {
    // TODO: Must include CJS here, otherwise upscaler fails to build because it can't find default
    return DEFAULT_OUTPUT_FORMATS;
  }
  return ['cjs'];
}

const runTTYProcess = (command: string, args: Array<string> = [], env = {}): Promise<null | number> => new Promise(resolve => {
  const spawnedProcess = spawn(command, args, {stdio: "inherit", env: { ...process.env, ...env }});

  spawnedProcess.on('exit', (code) => {
    resolve(code);
  });
});

const getFolder = (platform: Platform, runner: Runner) => runner === 'browserstack' ? 'browserstack' : platform;

const getAllTestFiles = (platform: Platform, runner: Runner): string[] => {
  const files: string[] = sync(path.resolve(TEST_DIR, 'integration', getFolder(platform, runner), `**/*.ts`));
  return files.map(file => file.split('/').pop() || '');
};

const getDependencies = async (platform: Platform, runner: Runner, ...specificFiles: (number | string)[]): Promise<Bundle[]> => {
  const filePath = path.resolve(TEST_DIR, 'integration', `${getFolder(platform, runner)}.dependencies.ts`);
  const { default: sharedDependencies } = await import(filePath);

  const sharedDependenciesSet = new Set<Bundle>();

  const files = specificFiles.length > 0 ? specificFiles : getAllTestFiles(platform, runner);

  for (const file of files) {
    const fileName = `${file}`.split('.').slice(0, -1).join('.');
    if (!sharedDependencies[fileName]) {
      throw new Error(`File ${fileName} does not have any shared dependencies defined.`);
    }
    sharedDependencies[fileName].forEach((fn: Bundle) => {
      sharedDependenciesSet.add(fn);
    });
  }
  return Array.from(sharedDependenciesSet);
}

/****
 * Main function
 */
const test = async (platform: Platform, runner: Runner, positionalArgs: (string | number)[], {
  browserstackAccessKey,
  verbose,
  skipUpscalerBuild,
  skipModelBuild,
  forceModelRebuild,
  skipBundle,
  skipTest,
}: {
  browserstackAccessKey?: string;
  skipUpscalerBuild?: boolean;
  skipModelBuild?: boolean;
  forceModelRebuild?: boolean;
  verbose?: boolean;
  skipBundle?: boolean;
  skipTest?: boolean;
}) => {
  let bsLocal: undefined | Browserstack = undefined;
  if (skipTest !== true && runner === 'browserstack') {
    bsLocal = await startBrowserstack(browserstackAccessKey);
    process.on('exit', async () => {
      if (bsLocal !== undefined && bsLocal.isRunning()) {
        await stopBrowserstack(bsLocal);
      }
    });
  }

  if (skipModelBuild !== true) {
    const modelPackages = getAllAvailableModelPackages();
    const durations = await buildModels(modelPackages, getOutputFormats(platform), {
      verbose,
      forceRebuild: forceModelRebuild,
    });
    if (verbose) {
      console.log([
        `** built models: ${getOutputFormats(platform)}`,
        ...modelPackages.map((modelPackage, i) => `  - ${modelPackage} in ${durations?.[i]} ms`),
      ].join('\n'));
    }
  }

  if (skipUpscalerBuild !== true) {
    const platformsToBuild: ('browser' | 'node' | 'node-gpu')[] = platform === 'browser' ? ['browser'] : ['node', 'node-gpu'];

    const durations: number[] = [];
    for (let i = 0; i < platformsToBuild.length; i++) {
      const duration = await buildUpscaler(platformsToBuild[i]);
      durations.push(duration);
    }
    console.log([
      `** built upscaler: ${platform}`,
      ...platformsToBuild.map((platformToBuild, i) => `  - ${platformToBuild} in ${durations?.[i]} ms`),
    ].join('\n'));
  }

  if (skipBundle !== true) {
    const dependencies = await getDependencies(platform, runner, ...positionalArgs);
    if (dependencies.length === 0) {
      throw new Error('One day there may be no defined dependencies, but today is not that day.')
    }
    const durations: number[] = [];
    for (const dependency of dependencies) {
      const start = performance.now();
      await dependency({
        verbose,
      });
      durations.push(performance.now() - start);
    }
    console.log([
      `** ran shared dependencies: ${platform}`,
      ...dependencies.map((fn, i) => `  - ${fn.name} in ${durations?.[i]} ms`),
    ].join('\n'));
  }

  if (skipTest !== true) {
    const args = [
      'pnpm',
      'jest',
      '--config',
      path.resolve(TEST_DIR, `jestconfig.${platform}.${runner}.js`),
      '--detectOpenHandles',
      // argv.watch ? '--watch' : undefined,
      ...positionalArgs,
    ].filter(Boolean).map(arg => `${arg}`);
    const code = await runTTYProcess(args[0], args.slice(1), { verbose });
    if (bsLocal !== undefined) {
      await stopBrowserstack(bsLocal);
    }
    if (code !== null) {
      process.exit(code);
    }
  }
}

/****
 * Functions to expose the main function as a CLI tool
 */
interface Args {
  watch?: boolean;
  platform: Platform;
  runner: Runner;
  skipBundle?: boolean;
  skipUpscalerBuild?: boolean;
  skipModelBuild?: boolean;
  forceModelRebuild?: boolean;
  kind?: string;
  positionalArgs: (string | number)[];
  browserstackAccessKey?: string;
  verbose?: boolean;

  // this is an option only for CI; lets us separate out our build step from our test step
  skipTest?: boolean;
}

const isValidPlatform = (platform?: string): platform is Platform => {
  return platform !== undefined && ['browser', 'node'].includes(platform);
}

const getPlatform = (argPlatform: string): Platform => {
  const platform = argPlatform?.trim();

  if (isValidPlatform(platform)) {
    return platform;
  }

  throw new Error(`Unsupported platform provided: ${platform}. You must pass either 'browser' or 'node'.`)
}

const isValidRunner = (runner?: string): runner is undefined | Runner => {
  return runner === undefined ? true : ['local', 'browserstack'].includes(runner);
}

const getRunner = (runner?: string): Runner => {
  if (isValidRunner(runner)) {
    return runner === undefined ? 'local' : runner;

  }
  throw new Error(`Unsupported runner provided: ${runner}. You must pass either 'local' or 'browserstack'.`)
}

const getArgs = async (): Promise<Args> => {
  const BROWSERSTACK_ACCESS_KEY = getBrowserstackAccessKey();

  const argv = await yargs(process.argv.slice(2)).options({
    watch: { type: 'boolean' },
    platform: { type: 'string', demandOption: true },
    skipUpscalerBuild: { type: 'boolean' },
    skipModelBuild: { type: 'boolean' },
    skipBundle: { type: 'boolean' },
    skipTest: { type: 'boolean' },
    forceModelRebuild: { type: 'boolean' },
    kind: { type: 'string' },
    verbose: { type: 'boolean' },
  }).argv;
  const platform = getPlatform(argv.platform);
  const runner = getRunner(argv.kind);
  let positionalArgs = argv._;
  if (!Array.isArray(positionalArgs)) {
    positionalArgs = [positionalArgs];
  }

  function ifDefined<T>(key: string, type: string) { return _ifDefined(argv, key, type) as T; }

  return {
    ...argv,
    browserstackAccessKey: BROWSERSTACK_ACCESS_KEY,
    platform,
    runner,
    positionalArgs,
    verbose: ifDefined('verbose', 'boolean'),
    forceModelRebuild: ifDefined('forceModelRebuild', 'boolean'),
  }
};

if (require.main === module) {
  (async () => {
    const {
      platform,
      runner,
      positionalArgs,
      browserstackAccessKey,
      verbose,
      skipUpscalerBuild,
      skipModelBuild,
      forceModelRebuild,
      skipBundle,
      skipTest,
    } = await getArgs();
    await test(platform, runner, positionalArgs, {
      browserstackAccessKey,
      skipUpscalerBuild,
      skipModelBuild,
      verbose,
      skipBundle,
      forceModelRebuild,
      skipTest,
    });
  })();
}
