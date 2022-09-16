const { exec, spawn } = require("child_process");
type StdOut = (chunk: string) => void;
type StdErr = (chunk: string) => void;
const callExec = (cmd: string, options: any = {}, stdout?: StdOut | boolean, stderr: StdErr | boolean = true): Promise<void> => new Promise((resolve, reject) => {
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

  return spawnedProcess;
});
export default callExec;

// export const runProcess = (command: string) => {
//   const spawnedProcess = spawn(command, { shell: true });

//   spawnedProcess.stdout.on('data', (data: any) => {
//     process.stdout.write(data.toString());
//   });

//   spawnedProcess.stderr.on('data', (data: any) => {
//     process.stderr.write(data.toString());
//   });

//   spawnedProcess.on('exit', (data: any) => {
//     if (data) {
//       process.stderr.write(data.toString());
//     }
//   });

//   return spawnedProcess;
// };
