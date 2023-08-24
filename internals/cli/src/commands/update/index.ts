import { Command } from '@commander-js/extra-typings';

export default (program: Command) => program
    .command('update')
    .description('Commands related to updating dependencies and such');
