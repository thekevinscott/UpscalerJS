/*****
 * Script for wrapping and running integration tests for Browser and Node
 */

import path from 'path';
import { spawn } from 'child_process';
import yargs from 'yargs';
import buildModels from '../scripts/package-scripts/build-model';
import { getAllAvailableModelPackages } from './package-scripts/utils/getAllAvailableModels';
import { OutputFormat } from './package-scripts/prompt/types';
import { ifDefined as _ifDefined } from './package-scripts/prompt/ifDefined';
import buildUpscaler from './package-scripts/build-upscaler';
import { Browserstack, getBrowserstackAccessKey, startBrowserstack, stopBrowserstack } from './package-scripts/utils/browserStack';
import { DEFAULT_OUTPUT_FORMATS } from './package-scripts/prompt/getOutputFormats';
import { TEST_DIR } from './package-scripts/utils/constants';
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

const runTTYProcess = (command: string, args: Array<string> = []): Promise<null | number> => new Promise(resolve => {
  const spawnedProcess = spawn(command, args, {stdio: "inherit"});

  spawnedProcess.on('exit', (code) => {
    resolve(code);
  });
});

/****
 * Main function
 */
const test = async (platform: Platform, runner: Runner, positionalArgs: (string | number)[], {
  browserstackAccessKey,
  skipBuild,
  skipModelBuild,
  verbose,
  forceModelRebuild,
}: {
  browserstackAccessKey?: string;
  skipBuild?: boolean;
  skipModelBuild?: boolean;
  verbose?: boolean;
  forceModelRebuild?: boolean;
}) => {
  let bsLocal: undefined | Browserstack = undefined;
  if (runner === 'browserstack') {
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
  if (skipBuild !== true) {
    if (platform === 'browser') {
      await buildUpscaler('browser');
    } else if (platform === 'node') {
      await buildUpscaler('node');
      await buildUpscaler('node-gpu');
    }
    console.log(`** built upscaler: ${platform}`)
  }
  const args = [
    'pnpm',
    'jest',
    '--config',
    path.resolve(TEST_DIR, `jestconfig.${platform}.${runner}.js`),
    '--detectOpenHandles',
    // argv.watch ? '--watch' : undefined,
    ...positionalArgs,
  ].filter(Boolean).map(arg => `${arg}`);
  const code = await runTTYProcess(args[0], args.slice(1));
  if (bsLocal !== undefined) {
    await stopBrowserstack(bsLocal);
  }
  if (code !== null) {
    process.exit(code);
  }
}

/****
 * Functions to expose the main function as a CLI tool
 */
interface Args {
  watch?: boolean;
  platform: Platform;
  runner: Runner;
  skipBuild?: boolean;
  skipModelBuild?: boolean;
  forceModelRebuild?: boolean;
  kind?: string;
  positionalArgs: (string | number)[];
  browserstackAccessKey?: string;
  verbose?: boolean;
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
    skipBuild: { type: 'boolean' },
    skipModelBuild: { type: 'boolean' },
    kind: { type: 'string' },
    verbose: { type: 'boolean' },
    forceModelRebuild: { type: 'boolean' },
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
      skipBuild,
      skipModelBuild,
      positionalArgs,
      browserstackAccessKey,
      verbose,
      forceModelRebuild,
    } = await getArgs();
    await test(platform, runner, positionalArgs, {
      browserstackAccessKey,
      skipBuild,
      skipModelBuild,
      verbose,
      forceModelRebuild,
    });
  })();
}
