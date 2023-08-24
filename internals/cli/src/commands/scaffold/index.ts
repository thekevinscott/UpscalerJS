import { Command } from '@commander-js/extra-typings';

export default (program: Command) => program
    .command('scaffold')
    .description('Commands related to scaffolding packages and models');
