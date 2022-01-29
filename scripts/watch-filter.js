const path = require('path');
const SRC = path.resolve(__dirname, '../packages/upscalerjs/src');
const EXCLUDES = [
  'tfjs.generated.ts',
  'test.ts',
];
const matches = (rootDir, fileOrDir) => {
  const min = Math.min(rootDir.length, fileOrDir.length);
  const isRootMatch = rootDir.substring(0, min) === fileOrDir.substring(0, min);
  if (!isRootMatch) {
    return false;
  }

  for (let i = 0; i < EXCLUDES.length; i++) {
    const excludes = EXCLUDES[i];

    if (fileOrDir.endsWith(excludes)) {
      return false;
    }
  }
  return true;
}
module.exports = (file) => {
  const isMatch = matches(SRC, file);
  if (isMatch) {
    console.log('check?', file)
  }
  return isMatch;
}
