import inquirer from 'inquirer';

export const getString = async (message: string, arg?: unknown) => {
  if (typeof arg == 'string') {
    return arg;
  }

  const response = await inquirer.prompt<{
    arg: string
  }>([
    {
      name: 'arg',
      message,
    },
  ]);
  return response.arg;
}
