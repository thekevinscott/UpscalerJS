import chokidar from 'chokidar';
import { error, verbose } from '@internals/common/logger';
import { ChildProcess } from 'child_process';
import path from 'path';
import { CLI_DIR, ROOT_DIR } from '@internals/common/constants';
import { SpawnError, spawnProcess } from './spawn-process.js';

const TIMEOUT_LENGTH = 250;

const renderDuration = (now: number) => ((performance.now() - now) / 1000).toFixed(2);

export const startWatch = (
  cmd: string, 
  paths: Parameters<typeof chokidar.watch>[0], 
  options: Parameters<typeof chokidar.watch>[1],
) => {
  const watcher = chokidar.watch([
    ...paths,
    path.join(CLI_DIR, 'src/**/*'),
  ], options);
  let timer: NodeJS.Timeout;
  let last: number;
  let iterations = 0;
  let spawnedProcess: ChildProcess | undefined;
  watcher.on('all', (event, file) => {
    console.clear();
    if (spawnedProcess) {
      verbose(`>> Killing previous spawned process ${spawnedProcess.pid}`);
      spawnedProcess.kill();
    }
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        verbose(`Running command "${cmd.trim()}" in watch mode, iteration ${iterations++} at ${new Date().toLocaleTimeString()}, ${last ? `last run was ${renderDuration(last)}s ago` : 'no last run'}`);
        verbose(`>> Running because of event "${event}" on file "${file.split(ROOT_DIR).pop()}"`);
        const now = performance.now();
        const [child, promise] = spawnProcess(cmd);
        spawnedProcess = child;
        await promise.catch(err => {
          if (!(err instanceof SpawnError)) {
            error(err.message);
          }
        });
        verbose(`Ran command "${cmd.trim()}" in watch mode, took ${renderDuration(now)}s`);
        spawnedProcess = undefined;
      } finally {
        last = performance.now();
      }
    }, TIMEOUT_LENGTH);
  });
};
