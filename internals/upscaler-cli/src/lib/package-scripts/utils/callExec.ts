import { exec, ExecOptions } from 'child_process';

export type StdOut = (chunk: string) => void;
export type StdErr = (chunk: string) => void;

export const callExec = (cmd: string, {
  verbose = false,
  ...options
}: {
  encoding?: 'buffer' | null;
  verbose?: boolean;
} & ExecOptions = {}, stdout?: StdOut | boolean, stderr?: StdErr | boolean): Promise<void> => new Promise((resolve, reject) => {
  if (verbose) {
    console.log(`Running command: ${cmd}`);
  }
  const spawnedProcess = exec(cmd, options, (error) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });

  if (stderr === true || verbose) {
    spawnedProcess.stderr?.pipe(process.stderr);
  } else if (stderr && typeof stderr !== 'boolean') {
    spawnedProcess.stderr?.on('data', stderr);
  }

  if (stdout === undefined || stdout === true) {
    spawnedProcess.stdout?.pipe(process.stdout);
  } else if (stdout) {
    spawnedProcess.stdout?.on('data', stdout);
  }
});

export default callExec;

