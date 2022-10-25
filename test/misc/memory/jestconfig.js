const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const TEST_ROOT = path.resolve(ROOT, 'test')

const jestconfig = require(path.resolve(TEST_ROOT, 'jestconfig.json'));
module.exports = {
  ...jestconfig,
  "setupFilesAfterEnv": [path.resolve(TEST_ROOT, "jest.setup.ts")],
  setupFiles: [],
  roots: [
    "<rootDir>",
  ],
  "globals": {
    "ts-jest": {
      "tsconfig": {
        ...jestconfig.globals['ts-jest'].tsconfig,
        "target": "esnext",
      }
    }
  }
};
