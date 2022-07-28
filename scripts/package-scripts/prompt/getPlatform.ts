import inquirer from 'inquirer';
import { Platform } from "./types";

export const AVAILABLE_PLATFORMS = ['node', 'node-gpu', 'browser'];

const isValidPlatform = (platform?: string | number): platform is Platform => {
  return typeof platform === 'string' && AVAILABLE_PLATFORMS.includes(platform);
};

export const getPlatform = async (platforms?: string | number) => {
  if (isValidPlatform(platforms)) {
    return platforms;
  }

  const { value } = await inquirer.prompt([
    {
      type: 'list',
      name: 'value',
      message: 'Which platforms do you want to build for?',
      choices: AVAILABLE_PLATFORMS,
    },
  ]);
  return value;
}

