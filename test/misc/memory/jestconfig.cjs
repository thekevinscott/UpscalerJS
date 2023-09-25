const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const TEST_ROOT = path.resolve(ROOT, 'test')

const jestconfig = require(path.resolve(TEST_ROOT, 'jestconfig.json'));
const tsJestRegex = Object.keys(jestconfig.transform).filter(key => key.includes('ts')).pop();
if (!tsJestRegex) {
  throw new Error('No matching key could be found for .ts');
}
const tsJestTsConfig = jestconfig.transform[tsJestRegex];
const transform = {
  ...jestconfig.transform,
  [tsJestRegex]: [
    tsJestTsConfig[0],
    {
      ...tsJestTsConfig[1],
      tsconfig: {
        ...tsJestTsConfig[1].tsconfig,
        "target": "esnext",
      }
    },
  ],
}
module.exports = {
  ...jestconfig,
  "setupFilesAfterEnv": [path.resolve(TEST_ROOT, "jest.setup.ts")],
  setupFiles: [],
  "testRegex": "(/.*|(\\.|/)(test|spec))\\.(tsx?)$",
  roots: [
    "<rootDir>",
  ],
  "transform": transform
};
