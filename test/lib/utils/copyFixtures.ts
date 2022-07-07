import fs from 'fs';
import path from 'path';

const ROOT = __dirname;
const FIXTURES = path.join(ROOT, '../../__fixtures__');
export const copyFixtures = (dist: string, includeFlower: boolean = true) => {
  fs.mkdirSync(path.join(dist, 'pixelator'), { recursive: true });
  fs.copyFileSync(path.join(FIXTURES, 'pixelator/pixelator.json'), path.join(dist, 'pixelator/pixelator.json'))
  fs.copyFileSync(path.join(FIXTURES, 'pixelator/pixelator.weights.bin'), path.join(dist, 'pixelator/pixelator.weights.bin'))
  if (includeFlower) {
    fs.copyFileSync(path.join(FIXTURES, 'flower-small.png'), path.join(dist, 'flower-small.png'))
  }
};
