/*****
 * Script for wrapping and running integration tests for Browser and Node
 */

import browserstack from 'browserstack-local';
import { spawn } from 'child_process';

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { buildUpscaler } from "../test/lib/utils/buildUpscaler";


const argv = yargs(hideBin(process.argv)).argv as {
  platform?: string;
  skipBuild?: boolean;
  _: Array<string>;
}

const runProcess = (command: string, args: Array<string> = []): Promise<null | number> => new Promise(resolve => {
  const spawnedProcess = spawn(command, args, {stdio: "inherit"});

  spawnedProcess.on('exit', (code) => {
    resolve(code);
  });
});

const startBrowserstack = async (): Promise<browserstack.Local> => new Promise(resolve => {

  const bsLocal = new browserstack.Local();
  bsLocal.start({
    'key': process.env.BROWSERSTACK_ACCESS_KEY,
    // 'localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
    'force': true,
    // 'onlyAutomate': 'true',
    // 'forceLocal': 'true',
    'onlyAutomate': true,
    'forceLocal': true,
  }, () => {
    resolve(bsLocal)
  });
});

const stopBrowserstack = (bsLocal: browserstack.Local) => new Promise(resolve => bsLocal.stop(resolve));

const isValidPlatform = (platform?: string): platform is 'browser' | 'node' => {
  return platform !== undefined && ['browser', 'node'].includes(platform);
}

const getPlatform = () => {
  const platform = argv.platform;

  if (isValidPlatform(platform)) {
    return platform;
  }

  throw new Error(`Unsupported platform provided: ${platform}. You must pass either 'browser' or 'node'.`)
}

const main = async () => {
  let bsLocal: undefined | browserstack.Local;
  const platform = getPlatform();
  if (platform === 'browser') {
    bsLocal = await startBrowserstack();
  }
  if (argv.skipBuild !== true) {
    await buildUpscaler(platform);
  }
  const code = await runProcess('yarn', ['jest', '--config', `test/jestconfig.${platform}.js`, '--detectOpenHandles', ...argv._]);
  if (bsLocal !== undefined) {
    await stopBrowserstack(bsLocal);
  }
  if (code !== null) {
    process.exit(code);
  }
};

main();
