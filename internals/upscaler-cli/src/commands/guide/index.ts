import { Command } from 'commander';

export default (program: Command) => program.command('guide')
    .description('Commands related to guides & examples');
