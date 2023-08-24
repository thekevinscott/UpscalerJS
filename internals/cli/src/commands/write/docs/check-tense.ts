import { Command } from '@commander-js/extra-typings';
import { checkTenses } from '../../../lib/commands/write/docs/check-tense.js';

export default (program: Command) => program.command('check-tense')
  .description('Check tense of docs')
  .action(async (opts) => {
    return await checkTenses();
  });

