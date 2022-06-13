/*****
 * Script for wrapping and running integration tests for Browser and Node
 */

import dotenv from 'dotenv';
import browserstack from 'browserstack-local';
import { spawn } from 'child_process';

import yargs from 'yargs';
import { buildUpscaler } from "../test/lib/utils/buildUpscaler";

dotenv.config();

const runProcess = (command: string, args: Array<string> = []): Promise<null | number> => new Promise(resolve => {
  const spawnedProcess = spawn(command, args, {stdio: "inherit"});

  spawnedProcess.on('exit', (code) => {
    resolve(code);
  });
});

const startBrowserstack = async (): Promise<browserstack.Local> => new Promise((resolve, reject) => {
  const bsLocal = new browserstack.Local();
  const config: any = {
    key: process.env.BROWSERSTACK_ACCESS_KEY,
    force: true,
    onlyAutomate: true,
    forceLocal: true,
  };
  bsLocal.start(config, (error) => {
    if (error) {
      return reject(error);
    }
    resolve(bsLocal);
  });
});

const stopBrowserstack = (bsLocal: browserstack.Local): Promise<void> => new Promise(resolve => bsLocal.stop(() => resolve()));

const isValidPlatform = (platform?: string): platform is 'browser' | 'node' => {
  return platform !== undefined && ['browser', 'node'].includes(platform);
}

const getPlatform = (argPlatform: string) => {
  const platform = argPlatform?.trim();

  if (isValidPlatform(platform)) {
    return platform;
  }

  throw new Error(`Unsupported platform provided: ${platform}. You must pass either 'browser' or 'node'.`)
}

const isValidRunner = (runner?: string): runner is undefined | 'local' | 'browserstack' => {
  return runner === undefined ? true : ['local', 'browserstack'].includes(runner);
}

const getRunner = (runner?: string): 'local' | 'browserstack' => {
  if (isValidRunner(runner)) {
    return runner === undefined ? 'local' : runner;

  }
  throw new Error(`Unsupported runner provided: ${runner}. You must pass either 'local' or 'browserstack'.`)
}

(async function main() {
  const argv = await yargs(process.argv.slice(2)).options({
    watch: { type: 'boolean' },
    platform: { type: 'string', demandOption: true },
    skipBuild: { type: 'boolean' },
    runner: { type: 'string' }
  }).argv;

  let bsLocal: undefined | browserstack.Local;
  const platform = getPlatform(argv.platform);
  const runner = getRunner(argv.runner);
  if (runner === 'browserstack') {
    bsLocal = await startBrowserstack();
    process.on('exit', async () => {
      if (bsLocal !== undefined && bsLocal.isRunning()) {
        await stopBrowserstack(bsLocal);
      }
    });
    if (bsLocal.isRunning() !== true) {
      throw new Error('Browserstack failed to start');
    }
  }

  if (argv.skipBuild !== true) {
    if (platform === 'browser') {
      await buildUpscaler(platform);
    } else if (platform === 'node') {
      await buildUpscaler('node');
      await buildUpscaler('node-gpu');
    }
  }
  const args = [
    'jest',
    // 'node',
    // '--expose-gc',
    // './node_modules/.bin/jest',
    '--config',
    `test/jestconfig.${platform}.${runner}.js`,
    '--detectOpenHandles',
    argv.watch ? '--watch' : undefined,
    ...argv._,
  ].filter(Boolean).map(arg => `${arg}`);
  const code = await runProcess(args[0], args.slice(1));
  if (bsLocal !== undefined) {
    await stopBrowserstack(bsLocal);
  }
  if (code !== null) {
    process.exit(code);
  }
})();
