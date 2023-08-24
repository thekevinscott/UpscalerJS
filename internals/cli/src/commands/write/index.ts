import { Command } from '@commander-js/extra-typings';

export default (program: Command) => program.command('write')
    .description('Commands related to writing files related to packages and models');
