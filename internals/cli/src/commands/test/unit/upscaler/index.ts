import { Command } from '@commander-js/extra-typings';

export default (program: Command) => program
    .command('upscaler')
    .description('Commands related to unit testing upscaler');
