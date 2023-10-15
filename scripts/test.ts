/*****
 * Script for wrapping and running integration tests for Browser and Node
 */

import path from 'path';
import { spawn } from 'child_process';
import yargs from 'yargs';
import { sync } from 'glob';
import { ifDefined as _ifDefined } from './package-scripts/prompt/ifDefined';
import { ROOT_DIR, TEST_DIR } from './package-scripts/utils/constants';
import { Bundle } from '../test/integration/utils/NodeTestRunner';
// import { ROOT_BUNDLER_OUTPUT_DIR } from '@internals/bundlers';
const ROOT_BUNDLER_OUTPUT_DIR = path.resolve(ROOT_DIR, 'tmp/bundlers');
/****
 * Types
 */
type Platform = 'browser' | 'node';
type Runner = 'local' | 'browserstack';
type Kind = 'integration' | 'memory' | 'model';

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
    return ['test.browser.mts'];
  }
  if (kind === 'model') {
    return ['model.ts'];
  }
  if (runner === 'browserstack') {
    const globPath = path.resolve(TEST_DIR, 'integration/browserstack/tests/**/*.mts');
    const files: string[] = sync(globPath);
    return files.map(file => file.split('/').pop() || '').filter(file => file !== 'vite.config.ts');
  }
  if (platform === 'browser') {
    const globPath = path.resolve(TEST_DIR, 'integration/clientside/tests/**/*.mts');
    const files: string[] = sync(globPath);
    return files.map(file => file.split('/').pop() || '').filter(file => file !== 'vite.config.ts');
  }

  if (platform === 'node') {
    const globPath = path.resolve(TEST_DIR, 'integration/serverside/tests/**/*.mts');
    const files: string[] = sync(globPath);
    return files.map(file => file.split('/').pop() || '').filter(file => file !== 'vite.config.mts');
  }
  throw new Error('Unsupported platform');
};

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
    });

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

/****
 * Main function
 */
const test = async (platform: Platform | Platform[], runner: Runner, kind: Kind, args: (string | number)[], {
  verbose,
  useGPU,
}: {
  verbose?: boolean;
  useGPU?: boolean,
}) => {
  const code = await runTTYProcess(args[0], args.slice(1), { verbose, platform, useGPU, ROOT_BUNDLER_OUTPUT_DIR });
  if (code !== null) {
    process.exit(code);
  }
}

/****
 * Functions to expose the main function as a CLI tool
 */
interface Args {
  watch?: boolean;
  platform: Platform | Platform[];
  runner: Runner;
  positionalArgs: (string | number)[];
  verbose?: boolean;
  kind: Kind;
  useGPU?: boolean;
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
  const argv = await yargs(process.argv.slice(2)).options({
    watch: { type: 'boolean' },
    platform: { type: 'string' },
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
