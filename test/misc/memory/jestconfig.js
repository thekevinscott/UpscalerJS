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
