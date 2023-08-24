import { Command } from '@commander-js/extra-typings';

export default (program: Command) => program
    .command('test')
    .description('Commands related to testing');
