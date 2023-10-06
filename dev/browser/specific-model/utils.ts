export const getRoot = (packageName: string) => `/node_modules/@upscalerjs/${packageName}`;
export const loadPackageJSON = async (packageName: string) => {
  const r = await fetch(`${getRoot(packageName)}/package.json?ts=${new Date().getTime()}`);
  return r.json();
};

export const loadPackageModels = async (packageName: string) => {
  const { exports } = await loadPackageJSON(packageName);
  return exports;
}

const loadPackageModel = async (packageName: string, modelName: string) => {
  const exports = await loadPackageModels(packageName);
  const modelSourceFiles = exports[modelName];
  return modelSourceFiles;
}

export const importModel = async (packageName: string, modelName = '.') => {
  const modelSourceFiles = await loadPackageModel(packageName, modelName);
  const importPath = `${getRoot(packageName)}/${modelSourceFiles.import}?ts=${new Date().getTime()}`;
  console.log(importPath);
  return import(importPath);
};

export const getModelPath = (packageName: string, modelPath: string) => {
  return `${getRoot(packageName)}/${modelPath}`;
}

export const getFixture = async (packageName: string, modelName = '.') => {
  const packageJSON = await loadPackageJSON(packageName);
  if (packageJSON['@upscalerjs']?.assets) {
    const fixture = packageJSON['@upscalerjs'].assets[modelName];
    if (!fixture) {
      throw new Error(`NO fixture found for ${packageName}/${modelName}`)
    }
    return `${getRoot(packageName)}/${fixture}?ts=${new Date().getTime()}`;
  }
  return `${getRoot(packageName)}/assets/fixture.png?ts=${new Date().getTime()}`;
}
