const path = require('path');

const match = (sources, fileOrDir, excludedSuffixes) => {
  const min = Math.min(sources.length, fileOrDir.length);
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    if (source.substring(0, min) !== fileOrDir.substring(0, min)) {
      return false;
    }
  }

  for (let i = 0; i < excludedSuffixes.length; i++) {
    const excludes = excludedSuffixes[i];

    if (fileOrDir.endsWith(excludes)) {
      return false;
    }
  }
  return true;
};

module.exports = (source, excludedSuffixes = []) => {
  if (typeof source === 'string') {
    return (file) => match([source], file, excludedSuffixes);
  }
  return (file) => match(sources, file, excludedSuffixes);
};
