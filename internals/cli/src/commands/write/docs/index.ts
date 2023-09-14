import { Command } from '@commander-js/extra-typings';

export default (program: Command) => program.command('docs')
    .description('Commands related to writing files related to documentation');


export const postProcess = (program: Command) => program
  .option('-c, --should-clear-markdown', 'Whether to clear markdown files or not', false)
  .option('-w, --watch', 'Whether to run in watch mode or not', false)
