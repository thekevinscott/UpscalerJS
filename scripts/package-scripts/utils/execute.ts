import { exec } from 'child_process';
const execute = (cmd: string): Promise<void> => new Promise((resolve, reject) => {
  const spawnedProcess = exec(cmd, {}, (error: Error | null) => {
    if (error) {
      reject(error.message);
    } else {
      resolve();
    }
  });
  spawnedProcess.stderr?.pipe(process.stderr);
  spawnedProcess.stdout?.pipe(process.stdout);
})
export default execute;

