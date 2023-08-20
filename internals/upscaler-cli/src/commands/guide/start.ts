// import inquirer from 'inquirer';
import { RegisterCommand } from '../../cli-types.js';
import { start } from '../../actions/guide/start.js';

export const registerGuideStart: RegisterCommand = (program) => {
  program.command('start')
    .description('Start an example')
    .argument('<string>', 'example to start')
    .option('--skipUpscalerBuild', 'if true, skip building UpscalerJS when starting up')
    .option('--verbose', 'verbose mode')
    .action(start);
};


