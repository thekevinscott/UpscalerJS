import { Command } from '@commander-js/extra-typings';

export default (program: Command) => program.command('start')
    .description('Commands related to starting guides & examples');
