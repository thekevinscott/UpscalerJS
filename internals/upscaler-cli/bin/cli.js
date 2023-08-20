#!/usr/bin/env ts-node 
import { CLI } from '../src/index.js';

(async () => {
  const cli = new CLI();
  await cli.run();
})();
