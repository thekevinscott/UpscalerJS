import inquirer from 'inquirer';

export const getNumber = async (message: string, arg?: unknown) => {
  if (typeof arg == 'number') {
    return arg;
  }

  const response = await inquirer.prompt<{
    arg: number;
  }>([
    {
      name: 'arg',
      message,
    },
  ]);
  return response.arg;
};
