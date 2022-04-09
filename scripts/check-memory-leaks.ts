/*****
 * Script for wrapping and running integration tests for Browser and Node
 */

import dotenv from 'dotenv';
import { spawn } from 'child_process';

import yargs from 'yargs/yargs';
import { buildUpscaler } from "../test/lib/utils/buildUpscaler";

dotenv.config();

const runProcess = (command: string, args: Array<string> = []): Promise<null | number> => new Promise(resolve => {
  const spawnedProcess = spawn(command, args, {stdio: "inherit"});

  spawnedProcess.on('exit', (code) => {
    resolve(code);
  });
});

(async function main() {
  const argv = await yargs(process.argv.slice(2)).options({
    skipBuild: { type: 'boolean' },
  }).argv;

  if (argv.skipBuild !== true) {
    await buildUpscaler('browser');
  }
  const args = [
    'pnpm',
    'jest',
    'test/misc/memory/test.browser.ts',
    '--config',
    'test/misc/memory/jestconfig.js',
    '--detectOpenHandles',
    ...argv._,
  ].filter(Boolean).map(arg => `${arg}`);
  const code = await runProcess(args[0], args.slice(1));
  if (code !== null) {
    process.exit(code);
  }
})();
