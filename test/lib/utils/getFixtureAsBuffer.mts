import path from 'path';
import fs from 'fs';
import { PNG } from 'pngjs';

export const getFixtureAsBuffer = (fullpath: string) => {
  const data = fs.readFileSync(fullpath);
  return PNG.sync.read(data);
};
