/*****
 * Script for wrapping and running integration tests for Browser and Node
 */

import path from 'path';
import { spawn } from 'child_process';
import yargs from 'yargs';
import { sync } from 'glob';
import { OutputFormat } from './package-scripts/prompt/types';
import { ifDefined as _ifDefined } from './package-scripts/prompt/ifDefined';
import { Browserstack, getBrowserstackAccessKey, startBrowserstack, stopBrowserstack } from './package-scripts/utils/browserStack';
import { DEFAULT_OUTPUT_FORMATS } from './package-scripts/prompt/getOutputFormats';
import { ROOT_DIR, TEST_DIR } from '@internals/common/constants';
import type { Bundle } from '../test/integration/utils/NodeTestRunner';
/****
 * Types
 */
type Platform = 'browser' | 'node';
type TargetPlatform = 'browser' | 'node' | 'node-gpu';
type Runner = 'local' | 'browserstack';
type Kind = 'integraticn' | 'memory' | 'model';

/****
 * Utility Functions & Classes
 */

const runTTYProcess = (command: string, args: Array<string> = [], env = {}): Promise<null | number> => new Promise(resolve => {
  const spawnedProcess = spawn(command, args, {stdio: "inherit", env: { ...process.env, ...env }});

  spawnedProcess.on('exit', (code) => {
    resolve(code);
  });
});

const getFolder = (platform: Platform, runner: Runner, kind: Kind) => {
  if (kind === 'memory') {
    return 'memory';
  }
  if (kind === 'model') {
    return 'model';
  }
  if (runner === 'browserstack') {
    return 'browserstack';
  }
  return platform;
};

const getAllTestFiles = (platform: Platform, runner: Runner, kind: Kind): string[] => {
  if (kind === 'memory') {
    return ['test.browser.ts'];
  }
  if (kind === 'model') {
    return ['model.ts'];
  }
  if (runner === 'browserstack') {
    const globPath = path.resolve(TEST_DIR, 'integration/browserstack/tests/**/*.mts');
    const files: string[] = sync(globPath);
    return files.map(file => file.split('/').pop() || '').filter(file => file !== 'vitest.config.ts');
  }
  const globPath = path.resolve(TEST_DIR, 'integration', getFolder(platform, runner, kind), `**/*.ts`);
  const files: string[] = sync(globPath);
  return files.map(file => file.split('/').pop() || '').filter(file => file !== 'vitest.config.ts');
};

type Bundle = (opts: Record<string, string| boolean | undefined>) => Promise<void>;

const getDependencies = async (_platforms: Platform | Platform[], runner: Runner, kind: Kind, ...specificFiles: (number | string)[]): Promise<Bundle[]> => {
  const sharedDependenciesSet = new Set<Bundle>();

  const platforms = ([] as Platform[]).concat(_platforms);
  const filesForPlatforms: {platform: Platform; files: (string | number)[]}[] = [];

  await Promise.all(platforms.map(async (platform: Platform) => {
    const filePath = path.resolve(TEST_DIR, 'integration', `${getFolder(platform, runner, kind)}.dependencies.ts`);
    const { default: sharedDependencies } = await import(filePath);

    const files = specificFiles.length > 0 ? specificFiles : getAllTestFiles(platform, runner, kind);
    filesForPlatforms.push({
      platform,
      files,
    })

    for (const file of files) {
      const fileName = `${file}`.split('.').slice(0, -1).join('.');
      if (fileName === '') {
        throw new Error(`Filename is empty. Original is: ${file}`);
      }
      if (!sharedDependencies[fileName]) {
        throw new Error(`File ${fileName} does not have any shared dependencies defined. The shared dependencies file is ${JSON.stringify(sharedDependencies, null, 2)} for filepath ${filePath}`);
      }
      sharedDependencies[fileName].forEach((fn: Bundle) => {
        sharedDependenciesSet.add(fn);
      });
    }
  }));
  const sharedDependencies = Array.from(sharedDependenciesSet);
  if (sharedDependencies.length === 0) {
    throw new Error(`One day there may be no defined dependencies, but today is not that day. ${JSON.stringify(filesForPlatforms)}`)
  }
  return sharedDependencies;
};

const getJestConfigPath = (platform: Platform | Platform[], runner: Runner, kind: Kind) => {
  if (kind === 'memory') {
    return path.resolve(TEST_DIR, 'misc/memory/jestconfig.js');
  }
  if (kind === 'model') {
    return path.resolve(TEST_DIR, 'jestconfig.model.js');
  }
  if (Array.isArray(platform)) {
    throw new Error(`An array of platforms was provided, but test kind does not support multiple platforms. Please provide an explicit platform`);
  }
  return path.resolve(TEST_DIR, `jestconfig.${platform}.${runner}.js`);
};

const getPlatformsToBuild = (platform: Platform | Platform[]): TargetPlatform[] => {
  if (Array.isArray(platform)) {
    return ['browser', 'node', 'node-gpu'];
  }
  return platform === 'browser' ? ['browser'] : ['node', 'node-gpu'];
}

/****
 * Main function
 */
const test = async (platform: Platform | Platform[], runner: Runner, kind: Kind, positionalArgs: (string | number)[], {
  browserstackAccessKey,
  verbose,
  skipBundle,
  skipTest,
  useGPU,
  watch,
}: {
  browserstackAccessKey?: string;
  verbose?: boolean;
  skipBundle?: boolean;
  skipTest?: boolean;
  useGPU?: boolean,
  watch?: boolean;
}) => {
  if (skipBundle !== true) {
    const dependencies = await getDependencies(platform, runner, kind, ...positionalArgs);
    const durations: number[] = [];
    for (const dependency of dependencies) {
      const start = performance.now();
      await dependency({
        verbose,
        // skipInstallNodeModules: true,
        // skipInstallLocalPackages: true,
        // skipCopyFixtures: true,
      });
      durations.push(performance.now() - start);
    }
    console.log([
      `** bundled: ${platform}`,
      ...dependencies.map((fn, i) => `  - ${fn.name} in ${durations?.[i]} ms`),
    ].join('\n'));
  }

  if (skipTest !== true) {
    let bsLocal: undefined | Browserstack = undefined;
    if (runner === 'browserstack') {
      bsLocal = await startBrowserstack({
        key: browserstackAccessKey,
        verbose,
      });
      console.log('verbose', verbose);
      if (verbose) {
        console.log('bsLocal.isRunning(): ', bsLocal?.isRunning());
      }
      process.on('exit', async () => {
        if (bsLocal !== undefined && bsLocal.isRunning()) {
          if (verbose) {
            console.log('Stopping browserstack');
          }
          await stopBrowserstack(bsLocal);
          if (verbose) {
            console.log('Stopped browserstack');
          }
        }
      });
    } else {
      if (verbose) {
        console.log('no browserstack');
      }
    }

    const jestConfigPath = getJestConfigPath(platform, runner, kind);
    const args = bsLocal ? ['pnpm', 'vitest', '-c', path.resolve(ROOT_DIR, './test/integration/browserstack/vite.config.mts')] : [
      'pnpm',
      'jest',
      '--config',
      jestConfigPath,
      '--detectOpenHandles',
      watch ? '--watch' : undefined,
      ...positionalArgs,
    ].filter(Boolean).map(arg => `${arg}`);

    if (verbose) {
      console.log(args.join(' '));
      if (bsLocal) {
        console.log('bsLocal.isRunning(): ', bsLocal?.isRunning());
      }
    }

    const code = await runTTYProcess(args[0], args.slice(1), { verbose, platform, useGPU });
    if (runner === 'browserstack') {
      if (!bsLocal) {
        throw new Error('bsLocal was never initialized even though runner is browserstack')
      }
      if (bsLocal.isRunning() === false) {
        console.log('bsLocal is already stopped.')
      } else {
        if (verbose) {
          console.log('Stopping browserstack', bsLocal.isRunning());
        }
        await stopBrowserstack(bsLocal);
        if (verbose) {
          console.log('Stopped browserstack')
        }
      }
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
  platform: Platform | Platform[];
  skipBundle?: boolean;
  runner: Runner;
  positionalArgs: (string | number)[];
  browserstackAccessKey?: string;
  verbose?: boolean;
  kind: Kind;
  useGPU?: boolean;

  // this is an option only for CI; lets us separate out our build step from our test step
  skipTest?: boolean;
}

const isValidPlatform = (platform?: string): platform is Platform => {
  return platform !== undefined && ['browser', 'node'].includes(platform);
}

const getPlatform = (kind: Kind, argPlatform?: string): Platform | Platform[] => {
  const platform = argPlatform?.trim();

  if (isValidPlatform(platform)) {
    return platform;
  }

  if (kind === 'model') {
    return ['browser', 'node'];
  }

  throw new Error(`Unsupported platform provided: ${platform}. You must pass either 'browser' or 'node'.`)
}

const isValidKind = (kind: string): kind is Kind => {
  return ['integration', 'memory', 'model'].includes(kind);
};

const getKind = (kind?: string): Kind => {
  if (kind === undefined) {
    throw new Error(`${kind} is undefined. You must pass either 'integration', 'memory', or 'model'.`)
  }
  if (!isValidKind(kind)) {
    throw new Error(`Unsupported kind provided: ${kind}. You must pass either 'integration', 'memory', or 'model'.`)
  }
  return kind;
};

const isValidRunner = (runner?: string): runner is undefined | Runner => {
  return runner === undefined ? true : ['local', 'browserstack'].includes(runner);
};

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
    platform: { type: 'string' },
    skipBundle: { type: 'boolean' },
    skipTest: { type: 'boolean' },
    runner: { type: 'string' },
    verbose: { type: 'boolean' },
    kind: { type: 'string' },
    useGPU: { type: 'boolean' },
  }).argv;
  const kind = getKind(argv.kind);
  const platform = getPlatform(kind, argv.platform);
  const runner = getRunner(argv.runner);
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
    kind,
    positionalArgs,
    verbose: ifDefined('verbose', 'boolean'),
  }
};

const main = async () => {
  const {
    platform,
    runner,
    positionalArgs,
    kind,
    ...args
  } = await getArgs();
  await test(platform, runner, kind, positionalArgs, {
    ...args,
  });
}

if (require.main === module) {
  main();
}
