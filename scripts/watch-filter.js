const path = require('path');
const SRC = path.resolve(__dirname, '../packages/upscalerjs/src');
const EXCLUDED_SUFFIXES = [
  'generated.ts',
  'test.ts',
];

const match = (rootDir, fileOrDir) => {
  const min = Math.min(rootDir.length, fileOrDir.length);
  const isRootMatch = rootDir.substring(0, min) === fileOrDir.substring(0, min);
  if (!isRootMatch) {
    return false;
  }

  for (let i = 0; i < EXCLUDED_SUFFIXES.length; i++) {
    const excludes = EXCLUDED_SUFFIXES[i];

    if (fileOrDir.endsWith(excludes)) {
      return false;
    }
  }
  return true;
};

module.exports = (file) => match(SRC, file);
