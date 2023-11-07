import path from 'path';
import * as url from 'url';
import asyncPool from "tiny-async-pool";
import { readFile, writeFile, } from '@internals/common/fs';
import { MODELS_DIR, } from '@internals/common/constants';
import { error, info, } from '@internals/common/logger';
import { getPackageJSON } from '@internals/common/package-json';
import { getTemplate as _getTemplate, } from '@internals/common/get-template';
import { getModels } from '../shared/getModels.js';

interface ModelDefinition {
  exportKey: string;
  umdPath: string;
  requirePath: string;
  importPath: string;
}

const NUMBER_OF_CONCURRENT_THREADS = 5;

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '_templates');

const getTemplate = (
  templateName: string,
  args: Parameters<typeof _getTemplate>[1] = {}
) => _getTemplate(path.resolve(TEMPLATES_DIR, templateName), args);

const validateExport = (entry: [string, unknown]): entry is [string, {
  umd: string;
  import: string;
  require: string;
}] => {
  const xport = entry[1];
  return typeof xport === 'object' && xport !== null && 'umd' in xport && 'require' in xport && 'import' in xport;
};

const getUMDNames = async (modelDirectoryPath: string) => JSON.parse(await readFile(path.resolve(modelDirectoryPath, 'umd-names.json')));
const getUmdKey = (umdPath: string) => umdPath.split('./').pop();

const writeModelFolder = async (modelDirectoryName: string) => {
  const modelDirectoryPath = path.resolve(MODELS_DIR, modelDirectoryName);
  const {
    name,
    version,
    description,
    keywords,
    module,
    types,
    'umd:main': umdMain,
    exports: xports,
    '@upscalerjs': {
      title,
      modelFamily,
      models: supplementaryModelInformation,
    },
  } = await getPackageJSON(modelDirectoryPath);
  if (!umdMain) {
    throw new Error(`No umd-main found in ${modelDirectoryName}/package.json`)
  }
  const umdNames = await getUMDNames(modelDirectoryPath);
  const umdIndexName = umdNames['.'];
  if (!umdIndexName) {
    throw new Error(`No UMD index name defined for . in ${modelDirectoryName}`)
  }

  const validExports = Object.entries(xports).filter(validateExport);
  if (validExports.length === 0) {
    throw new Error(`No valid exports for model ${modelDirectoryName}. Exports: ${JSON.stringify(xports, null, 2)}`);
  }

  const definedModels: ModelDefinition[] = Object.entries(xports).filter(validateExport).map(([exportKey, {
    umd: umdPath,
    require: requirePath,
    import: importPath,
  }]) => ({
    exportKey,
    umdPath,
    requirePath,
    importPath,
  }));
  if (definedModels.length === 0) {
    throw new Error(`No defined models for model ${modelDirectoryName}`);
  }
  const nonIndexModels = definedModels.filter(({ exportKey }) => exportKey !== '.');
  const sharedFileDependenies = [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.generated.ts",
    "../../packages/shared/src/esrgan/**/*.ts",
    "package.json",
    "tsconfig.json",
    "../tsconfig.json"
  ];
  const umdFileDependencies = [
    "tsconfig.umd.json",
    "umd-names.json",
    "../tsconfig.umd.json",
  ];
  const esmFileDependencies = [
    "tsconfig.esm.json",
    "../tsconfig.esm.json",
  ];
  const cjsFileDependencies = [
    "tsconfig.cjs.json",
    "../tsconfig.cjs.json",
  ];
  const exports = definedModels.reduce((obj, { exportKey, umdPath, requirePath, importPath }) => ({
    ...obj,
    [exportKey]: {
      umd: umdPath,
      require: requirePath,
      import: importPath,
    },
  }), {});
  const vars = {
    modelDirectoryName,
    name,
    version,
    description,
    keywords,
    exports,
    module,
    types,
    umdMain,
    scripts: nonIndexModels.reduce((obj, { exportKey: key, umdPath }) => {
      const umdName = umdNames[key];
      if (!umdName) {
        throw new Error(`No UMD index name defined for ${key} in ${modelDirectoryName}`)
      }
      const nonMinifiedOut = umdPath.replace('.min', '');
      const originalPath = nonMinifiedOut.replace('dist/umd', 'dist/umd-tmp');
      return {
        ...obj,
        [`build:umd:${getUmdKey(key)}`]: {
          "command": `pnpm build:umd:rollup:${getUmdKey(key)} && pnpm build:umd:uglify:${getUmdKey(key)}`
        },
        [`build:umd:rollup:${getUmdKey(key)}`]: {
          "command": `rollup -c ../rollup.config.cjs --input ${originalPath} --file ${nonMinifiedOut} --name ${umdName} --format umd`
        },
        [`build:umd:uglify:${getUmdKey(key)}`]: {
          "command": `uglifyjs ${nonMinifiedOut} --output ${umdPath} --compress --mangle --source-map`
        },
      };
    }, {
      "validate:build": {
        "command": `ts-node ../../scripts/package-scripts/validate-build.ts models/${modelDirectoryName}`
      },
      "build:umd:rollup:index": {
        "command": `rollup -c ../rollup.config.cjs --input ./dist/umd-tmp/models/${modelDirectoryName}/src/umd.js --file ./dist/umd/models/${modelDirectoryName}/src/umd.js --name ${umdIndexName} --format umd`
      },
      "build:umd:uglify:index": {
        "command": `uglifyjs ./dist/umd/models/${modelDirectoryName}/src/umd.js --output ./dist/umd/models/${modelDirectoryName}/src/umd.min.js --compress --mangle --source-map`
      },
      "build": {
        "command": "pnpm build:cjs && pnpm build:esm && pnpm build:umd",
        "files": [
          ...sharedFileDependenies,
          ...umdFileDependencies,
          ...esmFileDependencies,
          ...cjsFileDependencies,
        ],
        "output": [
          "dist/**"
        ]
      },
      "build:cjs": {
        "command": "tsc -p ./tsconfig.cjs.json --outDir ./dist/cjs --baseUrl ./src",
        "dependencies": [
          "scaffold"
        ],
        "files": [
          ...sharedFileDependenies,
          ...cjsFileDependencies,
        ],
        "output": [
          "dist/cjs/**"
        ]
      },
      "build:esm": {
        "command": "tsc -p ./tsconfig.esm.json --outDir ./dist/esm --baseUrl ./src",
        "dependencies": [
          "scaffold"
        ],
        "files": [
          ...sharedFileDependenies,
          ...esmFileDependencies,
        ],
        "output": [
          "dist/esm/**"
        ]
      },
      "build:umd": {
        "command": `pnpm run build:umd:tsc && pnpm run build:umd:index && ${nonIndexModels.map(m => `pnpm run build:umd:${getUmdKey(m.exportKey)}`).join(' && ')} && rimraf ./dist/umd-tmp`,
        "dependencies": [
          "scaffold"
        ],
        "files": [
          ...sharedFileDependenies,
          ...umdFileDependencies,
        ],
        "output": [
          "dist/umd/**"
        ]
      },
    }),
    title,
    modelFamily,
    models: supplementaryModelInformation,
  };
  const newPackageJSON = JSON.parse(await getTemplate('package.json.ejs', vars));
  await writeFile(path.resolve(modelDirectoryPath, 'package.json'), `${JSON.stringify(newPackageJSON, null, 2)}\n`);
};

const writeModelFolders = async (
  models: Array<string>,
) => {
  for await (const _ of asyncPool(NUMBER_OF_CONCURRENT_THREADS, models, writeModelFolder)) {
    // empty
  }
}

const main = async () => {
  const validModels = await getModels();

  if (validModels.length === 0) {
    error('No models selected, nothing to do.')
    return;
  }


  info(`Writing model folders for models:\n${validModels.map(m => `- ${m}`).join('\n')}`);
  await writeModelFolders(validModels);
};

main();
