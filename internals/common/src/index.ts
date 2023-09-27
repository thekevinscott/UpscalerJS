import { exec } from 'child_process';

export const runPNPMScript = async (script: string, ...filter: string[]): Promise<void> => new Promise((resolve, reject) => {
  const command = [
    'pnpm',
    filter.map(f => `--filter ${f}`).join(' '),
    'run',
    script,
  ].join(' ');
  exec(command, (error) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
});
