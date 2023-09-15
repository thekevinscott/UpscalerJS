import { Command } from '@commander-js/extra-typings';

export default (program: Command) => program
    .command('browser')
    .description('Commands related to browser unit testing for upscaler');
