import { exec } from 'child_process';

export const getCurrentBranch = () => new Promise<string>((resolve, reject) => {
  exec('git rev-parse --abbrev-ref HEAD', (err, stdout, _stderr) => {
    if (err) {
      reject(err);
    }

    if (typeof stdout === 'string') {
      resolve(stdout.trim());
    } else {
      reject(new Error('stdout is not a string'));
    }
  });
});
