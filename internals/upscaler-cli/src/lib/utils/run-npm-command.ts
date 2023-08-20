import { spawn } from 'child_process';

export const runNPMCommand = (command: string[], cwd: string) => new Promise<void>((resolve, reject) => {
  const child = spawn("npm", command, {
    shell: true,
    cwd,
    stdio: "inherit"
  });

  child.on('error', reject);

  child.on('close', code => {
    if (code === 0) {
      resolve();
    } else {
      reject(code);
    }
  });
});
