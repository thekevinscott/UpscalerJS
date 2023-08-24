import { readFileSync } from 'fs-extra';
import { PNG } from 'pngjs';

export const getFixtureAsBuffer = (fullpath: string) => PNG.sync.read(readFileSync(fullpath));
