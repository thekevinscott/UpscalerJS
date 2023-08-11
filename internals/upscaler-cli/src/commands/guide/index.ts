import { RegisterCommand } from '../../types.js';
import { registerGuideStart } from './start.js';

  //   "example:start": "pnpm __run_command ./start-example.ts",
export const guide: RegisterCommand = (program) => {
  const guide = program.command('guide')
    .description('Commands related to guides & examples')

  registerGuideStart(guide);
};

