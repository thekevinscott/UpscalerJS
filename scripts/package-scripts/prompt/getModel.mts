import inquirer from 'inquirer';
import { getAllAvailableModelPackages } from '../utils/getAllAvailableModels.mjs';

export const AVAILABLE_MODELS = getAllAvailableModelPackages();

export const getModel = async (model?: string | number | (string | number)[], all?: unknown) => {
  if (all === true) {
    const modelPackages = getAllAvailableModelPackages();
    return modelPackages;
  }

  if (typeof model == 'string') {
    return [model];
  }

  if (Array.isArray(model)) {
    return model.map(m => `${m}`);
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
