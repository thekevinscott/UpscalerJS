import path from 'path';
import fs from 'fs';

type Filter = (file: string) => boolean;

export const getAllFilesRecursively = (directory: string, filter: Filter = () => true): string[] => {
  return fs.readdirSync(directory).map(file => path.resolve(directory, file)).reduce((arr, file) => {
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      return arr.concat(getAllFilesRecursively(file, filter));
    }
    if (filter(file)) {
      return arr.concat([file]);
    }
    return arr;
  }, [] as string[])
}
