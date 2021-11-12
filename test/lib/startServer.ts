import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { startServer } from '../../packages/test-scaffolding/server.ts';

const argv = yargs(hideBin(process.argv)).argv

const main = async () => {
  let PORT = 8099;
  try {
    PORT = parseInt(argv.port as string);
  } catch(err) {}
  await startServer(PORT, () => {
    console.log(`server is running: http://localhost:${PORT}`);
  });
};

main();
