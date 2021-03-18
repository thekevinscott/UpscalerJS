const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv
const path = require('path');
const { startServer } = require(path.resolve(__dirname, '../../packages/test-scaffolding/server'));

const main = async () => {
  const PORT = argv.port || 8099;
  await startServer(PORT, () => {
    console.log(`server is running: http://localhost:${PORT}`);
  });
};

main();
