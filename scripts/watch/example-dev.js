const path = require('path');
const buildWatcher = require('./buildWatcher');

console.log(process.argv);

const UPSCALER_SRC = path.resolve(__dirname, '../packages/upscalerjs/src');
const EXCLUDED_SUFFIXES = [
  'generated.ts',
  'test.ts',
];

module.exports = buildWatcher(UPSCALER_SRC, EXCLUDED_SUFFIXES);

