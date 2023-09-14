import chokidar from 'chokidar';
import { error } from '@internals/common/logger';

const TIMEOUT_LENGTH = 100;

export const startWatch = (fn: () => Promise<unknown>, ...args: Parameters<typeof chokidar.watch>) => {
  const watcher = chokidar.watch(...args);
  let timer: NodeJS.Timeout;
  watcher.on('all', async () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await fn();
      } catch (err) {
        error(err);
      }
    }, TIMEOUT_LENGTH);
  });
};

