import { Command } from '@commander-js/extra-typings';

export default (program: Command) => program
    .command('unit')
    .description('Commands related to unit testing');
