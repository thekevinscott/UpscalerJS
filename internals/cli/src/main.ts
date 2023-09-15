import { CLI } from './lib/cli/CLI.js';

(async () => {
  const cli = new CLI();
  await cli.run();
})();

