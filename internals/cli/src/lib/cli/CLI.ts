import { program } from 'commander';
import path from 'path';
import { readFileSync } from '@internals/common/fs';
import { buildCommandsTree } from './build-commands-tree.js';
import { DEFAULT_LOG_LEVEL, setLogLevel } from '@internals/common/logger';
import { CLI_DIR } from '@internals/common/constants';

export class CLI {
  constructor() {
    const packageJSON = path.resolve(CLI_DIR, './package.json');
    const { name, description, version } = JSON.parse(readFileSync(packageJSON, 'utf-8'));

    program
      .name(name)
      .description(description)
      .option('-l, --log-level <level>', 'What level to log at', DEFAULT_LOG_LEVEL)
      .on('option:log-level', () => {
        const { logLevel } = program.opts();
        setLogLevel(logLevel);
      })
      .version(version);

  }

  run = async () => { // skipcq: JS-0105
    const srcDir = path.resolve(CLI_DIR, './src/commands');
    const root = await buildCommandsTree(srcDir);
    await root.registerProgram(program);
    return program.parseAsync();
  };
}
