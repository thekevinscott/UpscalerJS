/*****
 * Script for wrapping and running integration tests for Browser and Node
 */

import path from 'path';
import dotenv from 'dotenv';
import { spawn } from 'child_process';

import yargs from 'yargs';
import { buildUpscaler } from "../test/lib/utils/buildUpscaler";
import { getAllAvailableModelPackages } from '../test/lib/utils/getAllAvailableModels';
import buildModels from './package-scripts/build-model';

dotenv.config();

const ROOT_DIR = path.resolve(__dirname, '..');

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
    console.log(`** built upscaler: browser`)
  }
  if (argv.skipModelBuild !== true) {
    await buildModels(getAllAvailableModelPackages(), ['esm']);
    console.log(`** built models: ${['esm']}`)
  }
  const args = [
    'pnpm',
    'jest',
    path.resolve(ROOT_DIR, 'test/misc/memory/test.browser.ts'),
    '--config',
    path.resolve(ROOT_DIR, 'test/misc/memory/jestconfig.js'),
    '--detectOpenHandles',
    ...argv._,
  ].filter(Boolean).map(arg => `${arg}`);
  const code = await runProcess(args[0], args.slice(1));
  if (code !== null) {
    process.exit(code);
  }
})();
