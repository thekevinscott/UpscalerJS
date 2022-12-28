import fs, { readFile } from 'fs';
import yargs from 'yargs';
import { mkdirp, mkdirpSync, writeFile } from 'fs-extra';
import path from 'path';
import convertPythonModel from './convert-python-model';
import { getString } from './prompt/getString';
import { ifDefined } from './prompt/ifDefined';
import { ProgressBar } from './utils/ProgressBar';
import { getHashedFilepath } from './benchmark/performance/utils/utils';
import { MODELS_DIR } from './utils/constants';
import createNewModelFolder from './create-new-model-folder';
import { getNumber } from './prompt/getNumber';

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

const splitParams = (folder: string) => {
  const params: string[] = folder.split('-');
  const expectedParams = {
    C: parseInt(params[1].slice(1), 10),
    D: parseInt(params[2].slice(1), 10),
    G: parseInt(params[3].slice(1), 10),
    G0: parseInt(params[4].slice(2), 10),
    T: parseInt(params[5].slice(1), 10),
    patchSize: parseInt(`${params[7].split('patchsize').pop()}`, 10),
    compress: parseInt(`${params[8].split('compress').pop()}`, 10),
    sharpen: parseInt(`${params[9].split('sharpen').pop()}`, 10),
    architecture: params[0],
    scale: params[6][1],
    dataset: params[10].split('data').pop()?.toLowerCase(),
    varyCompression: params[11].split('vary_c').pop(),
  };
  return expectedParams;
}

const getModelInfo = (file: string) => {
  const parts = file.split('/');
  const folder = parts[0];
  const weight = parts.pop();
  const { architecture, dataset, C, D, G, G0, T, scale, patchSize, compress, sharpen, varyCompression } = splitParams(folder);
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
  const hash = getHashedFilepath(file).slice(0, 8);
  exportName = `${exportName}_${hash}`;
  // const pathToModelFolder = file.split('/').pop()?.split('.')[0];
  const modelPath = `models/esrgan/${file}/model.json`;
  if (modelPath.includes('.h5')) {
    console.error('export name', exportName);
    console.error('file', file.split('/').pop()?.split('.')[0]);
    console.error('weight', weight);
    throw new Error(`Bad model path, ".h5" should not be in the path name: ${modelPath}`);
  }
  return { exportName, scale, meta: {
    scale: parseInt(scale, 10),
    architecture,
    C,
    D,
    G,
    G0,
    T,
    patchSize,
    compress,
    sharpen,
    dataset,
    varyCompression,
    size,
  }, architecture, modelPath};
}

const getSrcForFile = (file: string) => {
    const { exportName, scale, meta, architecture, modelPath } = getModelInfo(file);
  return `
import getModelDefinition from '../../utils/getModelDefinition';
const ${exportName} = getModelDefinition(${scale}, '${architecture}', '${modelPath}', ${JSON.stringify(meta, null, 2)});
export default ${exportName};
`.trim();
};

const updateIndex = (folder: string, packageJSONPath: string, files: string[]) => {
  const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf-8'));
  packageJSON['exports'] = {
    ...packageJSON['exports'],
    ".": {
        "require": `./dist/cjs/index.js`,
        "import": `./dist/esm/index.js`
    }
  };
  fs.writeFileSync(packageJSONPath, JSON.stringify(packageJSON, null, 2), 'utf-8');

  const index: string[] = [];
  files.forEach(file => {
    const { exportName } = getModelInfo(file);
    index.push(`export { default as ${exportName}, } from './models/esrgan/${exportName}';`);
  });

  fs.writeFileSync(path.resolve(folder, 'src/index.ts'), index.join('\n'), 'utf-8')
}

const askToCreateNewModelFolder = async () => {
  const name = await getString('What is the name of the model folder you wish to create?', undefined);
  const description = await getString('What is the description of the model', undefined);
  const UMDName = await getString('What do you want to use for the UMD name', undefined);
  console.log('** Make sure to cd to your folder, and run "pnpm install && pnpm build"');
  await createNewModelFolder(name, description, UMDName);
}

const updateFileForModel = async (file: string, folder: string, packageJSONPath: string) => {
  const umdPath = path.resolve(folder, 'umd-names.json');
  const { exportName } = getModelInfo(file);

  const filePath = path.resolve(folder, `src/models/esrgan/${exportName}.ts`);
  await mkdirp(path.dirname(filePath));
  const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf-8'));
  packageJSON['exports'] = {
    ...packageJSON['exports'],
    [`./models/esrgan/${exportName}`]: {
      "require": `./dist/cjs/models/esrgan/${exportName}.js`,
      "import": `./dist/esm/models/esrgan/${exportName}.js`
    },
  };
  const umdNames: Record<string, string> = {
    ...JSON.parse(fs.readFileSync(umdPath, 'utf-8')),
    [`./models/esrgan/${exportName}`]: `${exportName}`,
  };
  await Promise.all([
    writeFile(filePath, getSrcForFile(file), 'utf-8'),
    writeFile(packageJSONPath, JSON.stringify(packageJSON, null, 2), 'utf-8'),
    writeFile(umdPath, JSON.stringify(umdNames, null, 2), 'utf-8'),
  ]);
};

/****
 * Main function
 */
const convertPythonModelFolder = async (folder: string, outputModel: string, {
  skipConvertModels, 
  shouldClearOutExports,
  shouldCreateNewModelFolder,
}: {
  skipConvertModels?: boolean;
  shouldClearOutExports?: boolean,
  shouldCreateNewModelFolder?: boolean,
}) => {
  const totalFiles = readModelDirectory(folder);
  const files = filterFiles(totalFiles);
  if (files.length === 0) {
    throw new Error(`No files found for folder ${folder} after filter. Pre-filter, the total files count was ${totalFiles.length}`)
  }

  if (shouldCreateNewModelFolder) {
    await askToCreateNewModelFolder();
  }

  const outputModelFolder = path.resolve(MODELS_DIR, outputModel);
  const packageJSONPath = path.resolve(outputModelFolder, 'package.json');
  const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf-8'));
  if (shouldClearOutExports === true) {
    packageJSON['exports'] = {};
  }

  const progressBar = new ProgressBar(files.length)
  for (const file of files) {
    const fullfilepath = path.resolve(folder, file);
    const fileWithoutModel = file.split('/').slice(0, -1).join('/')
    const outputDirectory = path.resolve(outputModelFolder, 'models/esrgan', fileWithoutModel);
    if (skipConvertModels !== true) {
      try {
        await convertPythonModel(fullfilepath, outputDirectory);
      } catch(err) {
        console.error('There was an error', err);
      }
    }
    const splitFile = file.split('.').shift();
    if (splitFile === undefined) {
      throw new Error(`Broken: ${file}`);
    }
    await updateFileForModel(splitFile, outputModelFolder, packageJSONPath)
    progressBar.update();
  }
  progressBar.end();

  updateIndex(outputModelFolder, packageJSONPath, files.map(file => {
    const splitFile = file.split('.').shift();
    if (splitFile === undefined) {
      throw new Error(`Broken: ${file}`);
    }
    return splitFile;
  }));
};

/****
 * Functions to expose the main function as a CLI tool
 */
type Answers = { 
  modelFolder: string; 
  outputModel: string; 
  skipConvertModels?: boolean;
  shouldClearOutExports?: boolean;
  shouldCreateNewModelFolder?: boolean;
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
      shouldCreateNewModelFolder: { type: 'boolean' },
    });
  })
    .help()
    .argv;

  const modelFolder = await getString('What is the folder containing the models you wish to convert?', argv._[0]);
  const outputModel = await getString('What is the folder you wish to write to? (Specify a non-absolute path, it will be placed in the models directory)', argv._[1]);

  return {
    skipConvertModels: ifDefined(argv, 'skipConvertModels', 'boolean'),
    shouldClearOutExports: ifDefined(argv, 'shouldClearOutExports', 'boolean'),
    shouldCreateNewModelFolder: ifDefined(argv, 'shouldCreateNewModelFolder', 'boolean'),
    outputModel,
    modelFolder
  };
}

if (require.main === module) {
  (async () => {
    const { modelFolder, outputModel, skipConvertModels, shouldClearOutExports, shouldCreateNewModelFolder } = await getArgs();
    await convertPythonModelFolder(modelFolder, outputModel, {
      skipConvertModels,
      shouldClearOutExports, 
      shouldCreateNewModelFolder,
    });
  })();
}
