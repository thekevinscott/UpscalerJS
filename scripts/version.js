/*****
 * Updates the root package JSON version
 * Updates the packages/upscalerjs version
 * Updates the upscaler dependencies in each examples folder to the current version
 */
const fs = require('fs');
const path = require('path');

const requestedVersion = process.argv.pop();

if (!requestedVersion) {
  throw new Error('No version provided.');
}

const ROOT = path.resolve(__dirname, '..');

const ROOT_PACKAGE = require(path.resolve(ROOT, 'package.json'));
const UPSCALERJS_PACKAGE = require(path.resolve(ROOT, 'packages/upscalerjs/package.json'));

const peerDependencies = ROOT_PACKAGE['peerDependencies'];
const currentUpscalerVersion = UPSCALERJS_PACKAGE['version'];

console.log(`Requested to upgrade version to ${requestedVersion}, current version is ${currentUpscalerVersion}`)

const updatePackageJSON = (packagePath, version, callback) => {
  const package = require(packagePath);
  package.version = version;
  if (callback) {
    callback(package);
  }
  fs.writeFileSync(packagePath, JSON.stringify(package, null, 2));
  console.log(`Wrote file ${packagePath}`);
}

updatePackageJSON(path.resolve(ROOT, 'packages/upscalerjs/package.json'), requestedVersion);
updatePackageJSON(path.resolve(ROOT, 'package.json'), requestedVersion);

const examplesPath = path.resolve(ROOT, 'examples');
const examples = fs.readdirSync(examplesPath)
examples.forEach(example => {
  const dirPath = path.resolve(examplesPath, example);
  if (fs.lstatSync(dirPath).isDirectory()) {
    const examplePackagePath = path.resolve(dirPath, 'package.json');
    updatePackageJSON(examplePackagePath, requestedVersion, package => {
      if (!package.dependencies) {
        package.dependencies = {};
      }
      package.dependencies.upscaler = requestedVersion;
      
      package.dependencies['@tensorflow/tfjs'] = peerDependencies['@tensorflow/tfjs'];
    });
  }
});

