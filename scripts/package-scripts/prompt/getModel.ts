import inquirer from 'inquirer';
import { getAllAvailableModelPackages } from '../utils/getAllAvailableModels';

export const AVAILABLE_MODELS = getAllAvailableModelPackages();

export const getModel = async (model?: string | number) => {
  if (typeof model == 'string') {
    return [model];
  }

  const { models } = await inquirer.prompt<{
    models: string[]
  }>([
    {
      type: 'checkbox',
      name: 'models',
      message: 'Which models do you want to build?',
      choices: AVAILABLE_MODELS,
    },
  ]);
  return models;
}
