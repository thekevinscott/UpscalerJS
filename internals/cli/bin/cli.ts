#!/usr/bin/env ts-node
import { CLI } from '../src/lib/cli/CLI.js';
// process.env.NODE_ENV = 'production';
process.env.TUNNELMOLE_TELEMETRY = '0';


(async () => {
  const cli = new CLI();
  await cli.run();
})();
