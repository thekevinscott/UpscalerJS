import { exec, ExecException, ExecOptions } from 'child_process';

export type StdOut = (chunk: string) => void;
export type StdErr = (chunk: string) => void;

export const isExecException = (error: unknown | ExecException): error is ExecException => {
  return !!error && typeof error === 'object' && 'message' in error && error.message !== undefined;
};

export const getParsedErrorMessage = (err: ExecException) => {
  const message = err.message;
  if (message !== '') {
    const errorMessage = message.split('Error: ').pop();
    if (errorMessage) {
      const pertinentLine = errorMessage.split('\n')[0].trim();
      return pertinentLine;
    }
    throw new Error(`Could not find "Error: " string in error message. Error message: ${message}`);
  }
  throw new Error('Error message returned from node process was blank');
}

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
      reject(new Error(error.message));
    } else {
      resolve();
    }
  });

  if (stderr === true || verbose) {
    spawnedProcess.stderr?.pipe(process.stderr);
  } else if (!!stderr && typeof stderr !== 'boolean') {
    spawnedProcess.stderr?.on('data', stderr);
  }

  if (stdout === undefined || stdout === true) {
    spawnedProcess.stdout?.pipe(process.stdout);
  } else if (!!stdout) {
    spawnedProcess.stdout?.on('data', stdout);
  }
});

export default callExec;
