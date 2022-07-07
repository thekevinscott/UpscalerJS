const { exec } = require("child_process");
type StdOut = (chunk: string) => void;
const callExec = (cmd: string, options: any, stdout?: StdOut | boolean, stdErr: boolean = true): Promise<void> => new Promise((resolve, reject) => {
  const spawnedProcess = exec(cmd, options, (error: Error) => {
    if (error) {
      reject(error.message);
    } else {
      resolve();
    }
  });

  if (stdErr) {
    spawnedProcess.stderr.pipe(process.stderr);
  }

  if (stdout === false) {

  } else if (stdout) {
    spawnedProcess.stdout.on('data', stdout);
  } else {
    spawnedProcess.stdout.pipe(process.stdout);
  }
})
export default callExec;
