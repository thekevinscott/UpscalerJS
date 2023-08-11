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

export const getStringArray = async (message: string, arg?: unknown) => {
  if (typeof arg === 'string') {
    return [arg];
  }

  if (Array.isArray(arg) && arg.length > 0) {
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
  return response.arg.split(' ').filter(Boolean);
}
