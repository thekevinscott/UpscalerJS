#!/usr/bin/env ts-node 
import { CLI } from '../src/lib/cli/CLI.js';

(async () => {
  const cli = new CLI();
  await cli.run();
})();
