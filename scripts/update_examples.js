/*****
 * Updates the upscaler dependencies in each examples folder to the current version
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const ROOT_PACKAGE = require(path.resolve(ROOT, 'package.json'));
const UPSCALERJS_PACKAGE = require(path.resolve(ROOT, 'packages/upscalerjs/package.json'));
const MODELS_PACKAGE = require(path.resolve(ROOT, 'packages/models/package.json'));

const peerDependencies = ROOT_PACKAGE['peerDependencies'];
const upscalerVersion = UPSCALERJS_PACKAGE['version'];
const modelsVersion = MODELS_PACKAGE['version'];

console.log(`Pinning version ${modelsVersion} in CDN definition`);

const updatePackageJSON = (packagePath, version, callback) => {
  const package = require(packagePath);
  package.version = version;
  if (callback) {
    callback(package);
  }
  fs.writeFileSync(packagePath, JSON.stringify(package, null, 2));
  console.log(`Wrote file ${packagePath}`);
}

const examplesPath = path.resolve(ROOT, 'examples');
const examples = fs.readdirSync(examplesPath)
examples.forEach(example => {
  const dirPath = path.resolve(examplesPath, example);
  if (fs.lstatSync(dirPath).isDirectory()) {
    const examplePackagePath = path.resolve(dirPath, 'package.json');
    updatePackageJSON(examplePackagePath, upscalerVersion, package => {
      if (!package.dependencies) {
        package.dependencies = {};
      }
      package.dependencies.upscaler = upscalerVersion;
      
      package.dependencies['@tensorflow/tfjs'] = peerDependencies['@tensorflow/tfjs'];
      package.version = UPSCALERJS_PACKAGE.version;
    });
  }
});
