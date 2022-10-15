import fs from 'fs';
import yargs from 'yargs';
import { mkdirpSync } from 'fs-extra';
import path from 'path';
import convertPythonModel from './convert-python-model';
import { getString } from './prompt/getString';
import { ifDefined } from './prompt/ifDefined';
import { ProgressBar } from './utils/ProgressBar';

/****
 * Type Definitions
 */

/****
 * Constants
 */
const ROOT_DIR = path.resolve(__dirname, '../..');
const MODELS_FOLDER = path.resolve(ROOT_DIR, 'models');

/****
 * Utility Functions
 */
const filterReadDir = (file: string) => {
  return !['.DS_Store'].includes(file);
};

const readModelDirectory = (root: string, folder = '') => {
  const files: string[] = [];
  const dirToRead = path.resolve(root, folder);
  for (const file of fs.readdirSync(dirToRead)) {
    if (filterReadDir(file)) {
      const relativefilepath = path.join(folder, file);
      const fullfilepath = path.resolve(root, folder, file);
      if (fs.lstatSync(fullfilepath).isDirectory()) {
        for (const child of readModelDirectory(root, relativefilepath)) {
          files.push(child);
        }
      } else {
        files.push(relativefilepath);
      }
    }
  }
  return files;
}

const filterFiles = (files: string[]) => {
  return files.filter(file => (file.endsWith('.h5')) && !file.includes('srgan'));
}

const convertStringToExport = (name: string) => {
  const parts = name.split('-');
  return parts.slice(1).filter(Boolean).reduce((str, part) => {
    return `${str}${part[0].toUpperCase()}${part.slice(1)}`;
  }, parts[0]);
}

const getModelInfo = (file: string) => {
  const parts = file.split('/');
  const folder = parts[0];
  const weight = parts.pop();
  const params = folder.split('-');
  const architecture = params[0];
  const scale = params[6][1];
  const dataset = params[10].split('data').pop();
  let exportName = convertStringToExport(`${folder.split('patch')[0]}-${weight?.split('vary_cFalse').pop()?.split('_').join('-').split('.')[0]}-data${dataset}`);
  let size;
  if (exportName.startsWith('rdnC1D2G4G064T10')) {
    size = 'small';
    exportName = `small${exportName.slice(16)}`;
  }
  if (exportName.startsWith('rdnC1D10G64G064T10')) {
    size = 'medium';
    exportName = `medium${exportName.slice(18)}`;
  }
  if (exportName.startsWith('rrdn')) {
    size = 'large';
    exportName = `large${exportName.slice(18)}`;
  }
  const modelPath = `models/${file}/${weight?.split('.')[0]}/model.json`;
  return { exportName, scale, meta: {
    scale: parseInt(scale, 10),
    architecture,
    C: parseInt(params[1].slice(1), 10),
    D: parseInt(params[2].slice(1), 10),
    G: parseInt(params[3].slice(1), 10),
    G0: parseInt(params[4].slice(2), 10),
    T: parseInt(params[5].slice(1), 10),
    patchSize: parseInt(`${params[7].split('patchsize').pop()}`, 10),
    compress: parseInt(`${params[8].split('compress').pop()}`, 10),
    sharpen: parseInt(`${params[9].split('sharpen').pop()}`, 10),
    dataset,
    varyCompression: params[11].split('vary_c').pop(),
    size,
  }, architecture, modelPath};
}

const updateIndex = (folder: string, files: string[], shouldClearOutExports?: boolean) => {
  const packageJSONPath = path.resolve(folder, 'package.json');
  const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf-8'));
  if (shouldClearOutExports === true) {
    packageJSON['exports'] = {};
  }
  packageJSON['exports'] = {
    ...packageJSON['exports'],
    ".": {
        "require": `./dist/cjs/index.js`,
        "import": `./dist/esm/index.js`
    }
  };
  const umdPath = path.resolve(folder, 'umd-names.json');
  const umdNames: Record<string, string> = {};

  const index: string[] = [];
  files.forEach(file => {
    const { exportName, scale, meta, architecture, modelPath } = getModelInfo(file);
    const indexPath = path.resolve(folder, `src/models/esrgan/${exportName}.ts`);
    mkdirpSync(path.dirname(indexPath));
    fs.writeFileSync(indexPath, `
import getModelDefinition from '../../utils/getModelDefinition';
const ${exportName} = getModelDefinition(${scale}, '${architecture}', '${modelPath}', ${JSON.stringify(meta, null, 2)});
export default ${exportName};
`.trim(), 'utf-8');
    packageJSON['exports'] = {
      ...packageJSON['exports'],
      [`./models/esrgan/${exportName}`]: {
        "require": `./dist/cjs/models/esrgan/${exportName}.js`,
        "import": `./dist/esm/models/esrgan/${exportName}.js`
      },
    };
    umdNames[`./models/esrgan/${exportName}`] = `${exportName}`;
    fs.writeFileSync(packageJSONPath, JSON.stringify(packageJSON, null, 2), 'utf-8');
    fs.writeFileSync(umdPath, JSON.stringify(umdNames, null, 2), 'utf-8');
    index.push(`export { default as ${exportName}, } from './models/esrgan/${exportName}';`);
  });

  fs.writeFileSync(path.resolve(folder, 'src/index.ts'), index.join('\n'), 'utf-8')
}

/****
 * Main function
 */
const convertPythonModelFolder = async (folder: string, outputModel: string, convertModels = true, shouldClearOutExports?: boolean) => {
  const files = filterFiles(readModelDirectory(folder));
  const progressBar = new ProgressBar(files.length)
  const outputModelFolder = path.resolve(MODELS_FOLDER, outputModel);
  for (const file of files) {
    const fullfilepath = path.resolve(folder, file);
    const outputDirectory = path.resolve(outputModelFolder, 'models', file);
    if (convertModels) {
      await convertPythonModel(fullfilepath, outputDirectory);
    }
    progressBar.update();
  }
  progressBar.end();

  updateIndex(outputModelFolder, files, shouldClearOutExports);
};

/****
 * Functions to expose the main function as a CLI tool
 */
type Answers = { 
  modelFolder: string; 
  outputModel: string; 
  skipConvertModels?: boolean;
  shouldClearOutExports?: boolean;
}

const getArgs = async (): Promise<Answers> => {
  const argv = await yargs.command('convert-python-model-folder', 'convert folder', yargs => {
    yargs.positional('folder', {
      describe: 'The folder containing models',
    }).positional('output', {
      describe: 'The output model folder to write to',
    }).options({
      skipConvertModels: { type: 'boolean' },
      shouldClearOutExports: { type: 'boolean' },
    });
  })
    .help()
    .argv;

  const modelFolder = await getString('What is the folder containing the models you wish to convert?', argv._[0]);
  const outputModel = await getString('What is the folder you wish to write to? (Specify a non-absolute path, it will be placed in the models directory)', argv._[1]);

  return {
    skipConvertModels: ifDefined(argv, 'skipConvertModels', 'boolean'),
    shouldClearOutExports: ifDefined(argv, 'shouldClearOutExports', 'boolean'),
    outputModel,
    modelFolder
  };
}

if (require.main === module) {
  (async () => {
    const { modelFolder, outputModel, skipConvertModels } = await getArgs();
    await convertPythonModelFolder(modelFolder, outputModel, skipConvertModels !== true, shouldClearOutExports);
  })();
}
