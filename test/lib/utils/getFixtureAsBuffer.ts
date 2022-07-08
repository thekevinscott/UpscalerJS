import path from 'path';
import fs from 'fs';
import * as _PNG from 'pngjs';
const { PNG } = _PNG;

export const getFixtureAsBuffer = (pathname: string) => {
  const fullpath = path.resolve(__dirname, "../../__fixtures__", pathname);
  const data = fs.readFileSync(fullpath);
  return PNG.sync.read(data);
};
