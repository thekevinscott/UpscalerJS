import { CLI } from '../dist/src/lib/cli/CLI.js';

(async () => {
  const cli = new CLI();
  await cli.run();
})();

