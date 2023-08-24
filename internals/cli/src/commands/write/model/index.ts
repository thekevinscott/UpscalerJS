import { Command } from '@commander-js/extra-typings';

export default (program: Command) => program.command('model')
    .description('Commands related to writing files related to models');

