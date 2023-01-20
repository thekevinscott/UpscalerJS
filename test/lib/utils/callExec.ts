import { exec, ExecOptions } from 'child_process';

type StdOut = (chunk: string) => void;
type StdErr = (chunk: string) => void;

const callExec = (cmd: string, {
  verbose,
  ...options
}: {
  encoding?: 'buffer' | null;
  verbose?: boolean;
} & ExecOptions = {}, stdout?: StdOut | boolean, stderr: StdErr | boolean = true): Promise<void> => new Promise((resolve, reject) => {
  if (verbose) {
    console.log(`Executing: ${cmd}`);
  }
  const spawnedProcess = exec(cmd, options, (error) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });

  if ((!!stderr && typeof stderr !== 'boolean') || verbose) {
    spawnedProcess.stderr?.on('data', stderr);
  } else if (stderr === true) {
    spawnedProcess.stderr?.pipe(process.stderr);
  }

  if (stdout === undefined || stdout === true || verbose) {
    spawnedProcess.stdout?.pipe(process.stdout);
  } else if (!!stdout) {
    spawnedProcess.stdout?.on('data', stdout);
  }
});

export default callExec;
