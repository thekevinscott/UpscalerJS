const path = require('path');
const buildWatcher = require('./buildWatcher');

const SRC = path.resolve(__dirname, '../packages/upscalerjs/src');
const EXCLUDED_SUFFIXES = [
  'generated.ts',
  'test.ts',
];

module.exports = buildWatcher(SRC, EXCLUDED_SUFFIXES);
