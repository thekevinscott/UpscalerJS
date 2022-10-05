import browserstack from 'browserstack-local';

export type Browserstack = browserstack.Local;

export const startBrowserstack = async (key?: string): Promise<Browserstack> => new Promise((resolve, reject) => {
  if (!key) {
    throw new Error('A key must be passed to start up the local browserstack service');
  }
  const bs = new browserstack.Local();
  bs.start({
    key,
    force: true,
    onlyAutomate: true,
    forceLocal: true,
  }, (error) => {
    if (error) {
      return reject(error);
    }
    if (bs.isRunning() !== true) {
      throw new Error('Browserstack failed to start');
    }
    resolve(bs);
  });
});

export const stopBrowserstack = (bs: Browserstack): Promise<void> => new Promise(resolve => bs.stop(() => resolve()));
