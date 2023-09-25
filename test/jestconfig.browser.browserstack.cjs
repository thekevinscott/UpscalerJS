const jestconfig = require('./jestconfig.json');
module.exports = {
  ...jestconfig,
  roots: [
    "<rootDir>/integration/browserstack",
  ],
};
