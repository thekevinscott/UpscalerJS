import { Command } from '@commander-js/extra-typings';

export default (program: Command) => program
    .command('build')
    .description('Commands related to building packages and models');
