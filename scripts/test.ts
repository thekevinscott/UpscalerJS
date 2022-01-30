/*****
 * 
 */

import browserstack from 'browserstack-local';
import path from 'path';
import { spawn } from 'child_process';

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { buildUpscaler } from "../test/lib/utils/buildUpscaler";


const argv = yargs(hideBin(process.argv)).argv as {
  platform?: string;
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
  const bsLocal = await startBrowserstack();
  const platform = getPlatform();
  await buildUpscaler(platform);
  const code = await runProcess('yarn', ['jest', '--config', `test/jestconfig.${platform}.js`, '--detectOpenHandles', ...argv._]);
  await stopBrowserstack(bsLocal);
  if (code !== null) {
    process.exit(code);
  }
};

main();
