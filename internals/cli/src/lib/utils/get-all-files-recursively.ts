import path from 'path';
import fs from 'fs';

type Filter = (file: string) => boolean;

export const getAllFilesRecursively = (directory: string, filter?: Filter): string[] => {
  return fs.readdirSync(directory).map(file => path.resolve(directory, file)).reduce((arr, file) => {
    const stat = fs.statSync(file);
    if (stat?.isDirectory()) {
      return arr.concat(getAllFilesRecursively(file, filter));
    }
    if (filter === undefined || filter(file)) {
      return arr.concat([file]);
    }
    return arr;
  }, [] as string[])
}
