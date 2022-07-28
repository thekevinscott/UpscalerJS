import yargs, { Options } from 'yargs';
import inquirer, { QuestionCollection } from 'inquirer';

export interface PromptOption<T> extends Options {
  name: string;
  isValidType?: IsValidType<T>;
  prompt?: QuestionCollection;
};

async function prompt<T extends unknown[]>(...options: PromptOption<T>[]) {
  const yargsOptions: {
    [key: string]: Options;
  } = options.reduce((obj, option) => {
    const { name, isValidType, ...yargsOption } = option;
    return {
      ...obj,
      [name]: yargsOption,
    };
  }, {});
  const argv = await yargs(process.argv.slice(2)).options(yargsOptions).argv;

  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    if (option.isValidType && option.prompt) {
      argv[option.name] = await getArg(argv[option.name], option.isValidType, option.prompt);
    }
  }
  return argv;
}

export type IsValidType<ExpectedType> = (arg: any) => arg is ExpectedType;

async function getArg<ExpectedType>(defaultArg: ExpectedType, isValidType: IsValidType<ExpectedType>, promptOption: QuestionCollection): Promise<ExpectedType> {
  if (isValidType(defaultArg)) {
    return defaultArg;
  }
  const { arg } = await inquirer.prompt<{
    arg: ExpectedType;
  }>(promptOption);
  return arg;
}

export default prompt;
