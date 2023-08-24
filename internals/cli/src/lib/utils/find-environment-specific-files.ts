import { readdir } from '@internals/common/fs';

export const findEnvironmentSpecificFiles = async (folder: string) => {
  const files = await readdir(folder);
  return files.filter(file => /^(.*).(browser|node).(js|ts)$/.test(file));
};
