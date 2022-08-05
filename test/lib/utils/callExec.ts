const { exec } = require("child_process");
type StdOut = (chunk: string) => void;
type StdErr = (chunk: string) => void;
const callExec = (cmd: string, options: any, stdout?: StdOut | boolean, stderr: StdErr | boolean = true): Promise<void> => new Promise((resolve, reject) => {
  const spawnedProcess = exec(cmd, options, (error: Error) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });

  if (stderr === true) {
    spawnedProcess.stderr.pipe(process.stderr);
  } else if (!!stderr && typeof stderr !== 'boolean') {
    spawnedProcess.stderr.on('data', stderr);
  }

  if (stdout === false) {

  } else if (stdout) {
    spawnedProcess.stdout.on('data', stdout);
  } else {
    spawnedProcess.stdout.pipe(process.stdout);
  }
})
export default callExec;
