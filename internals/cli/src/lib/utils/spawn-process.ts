import { ChildProcess, SpawnOptions, spawn } from "child_process";

export class SpawnError extends Error {
  code: null | number;
  constructor(code: null | number) {
    super(`Exited with code ${code}`);
    this.code = code;
  }
}

export const spawnProcess = (_cmd: string, { cwd } : SpawnOptions = {}): [ChildProcess, Promise<void>] => {
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
    cwd,
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


