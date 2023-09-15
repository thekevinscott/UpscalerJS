import chokidar from 'chokidar';
import { error, verbose } from '@internals/common/logger';
import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import { CLI_DIR, ROOT_DIR } from '@internals/common/constants';

const TIMEOUT_LENGTH = 250;

class SpawnError extends Error {
  code: null | number;
  constructor(code: null | number) {
    super(`Exited with code ${code}`);
    this.code = code;
  }
}

export const spawnProcessThatInheritsStdioAndPreservesColor = (_cmd: string): [ChildProcess, Promise<void>] => {
  let resolve: () => void;
  let reject: (err: unknown) => void;
  const promise = new Promise<void>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  const cmd = _cmd.split(' ');
  const spawnedProcess = spawn(cmd[0], cmd.slice(1), {
    shell: true,
    stdio: 'inherit',
  });
  spawnedProcess.on('close', (code) => {
    if (code !== 0) {
      reject(new SpawnError(code));
    } else {
      resolve();
    }
  });
  process.on('exit', () => {
    console.log('exiting, kill process', spawnedProcess.pid);
    spawnedProcess.kill();
  });
  return [
    spawnedProcess,
    promise,
  ];
};

const d = (now: number) => ((performance.now() - now) / 1000).toFixed(2);

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
  watcher.on('all', async (event, file, stats) => {
    console.clear();
    if (spawnedProcess) {
      verbose(`>> Killing previous spawned process ${spawnedProcess.pid}`);
      spawnedProcess.kill();
    }
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        verbose(`Running command "${cmd.trim()}" in watch mode, iteration ${iterations++} at ${new Date().toLocaleTimeString()}, ${last ? `last run was ${d(last)}s ago` : 'no last run'}`);
        verbose(`>> Running because of event "${event}" on file "${file.split(ROOT_DIR).pop()}"`);
        const now = performance.now();
        const [child, promise] = spawnProcessThatInheritsStdioAndPreservesColor(cmd);
        spawnedProcess = child;
        await promise.catch(err => {
          if (err instanceof SpawnError) {
            // if (err.code !== null) {
            //   error(err.message);
            // }
          } else {
            error(err.message);
          }
        });
        verbose(`Ran command "${cmd.trim()}" in watch mode, took ${d(now)}s`);
        spawnedProcess = undefined;
      } finally {
        last = performance.now();
      }
    }, TIMEOUT_LENGTH);
  });
};
