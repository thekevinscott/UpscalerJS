const config = require('./.eslintrc.js');
module.exports = {
  ...config,
  "ignorePatterns": ["**/*.browser.ts"],
};
