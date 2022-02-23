// const jestconfig = require('./jestconfig');
// module.exports = {
//   ...jestconfig,
//   "testRunner": "jest-circus/runner",
//   "preset": "ts-jest",
//   "testRegex": "test.browser.js",
// }

const jestconfig = require('../../jestconfig.json');
module.exports = {
  ...jestconfig,
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
