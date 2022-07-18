const jestconfig = require('./jestconfig.json');
module.exports = {
  ...jestconfig,
  // "testRegex": "(/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  "testRegex": "(^((?!.*(utils)).).*\.ts$)",
  roots: [
    "<rootDir>/integration/browser",
  ],
};
