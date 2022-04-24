const config = require('./.eslintrc.js');
module.exports = {
  ...config,
  "ignorePatterns": ["**/*.node.ts"],
};
