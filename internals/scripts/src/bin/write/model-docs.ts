import path from 'path';
import { parseArgs } from "node:util";
import { exists, readFile, readdir, stat, writeFile } from '@internals/common/fs';
import { MODELS_DIR, SHARED_DIR } from '@internals/common/constants';
import { error, info, warn } from '@internals/common/logger';
import { JSONSchema, getPackageJSON } from '@internals/common/package-json';

const getModelFamily = (packageJSON: JSONSchema) => packageJSON['@upscalerjs']?.['modelFamily'];

const getSharedDoc = async (modelFamily: string) => {
  const sharedDoc = path.resolve(SHARED_DIR, 'src', modelFamily, 'DOC.mdx');
  if (!await exists(sharedDoc)) {
    throw new Error(`File does not exist: ${sharedDoc}`)
  }
  return await readFile(sharedDoc);
};

const getSnippets = async (model: string): Promise<Record<string, string>> => {
  const snippets: Record<string, string> = {};
  const docSnippetsPath = path.resolve(MODELS_DIR, model, 'doc-snippets');
  if (!await exists(docSnippetsPath)) {
    throw new Error(`doc snippets folder does not exist at "${docSnippetsPath}"`)
  }
  const snippetPaths = await readdir(docSnippetsPath);

  for (const snippetPath of snippetPaths) {
    const snippet = await readFile(path.resolve(docSnippetsPath, snippetPath)) ?? '';
    const snippetKey = snippetPath.split('.').slice(0, -1).join('.');
    if (typeof snippetKey !== 'string') {
      throw new Error(`Bad snippet key: ${snippetKey}`)
    }
    snippets[`snippets/${snippetKey}`] = snippet.trim();
  }
  return snippets;
};

const getPackageJSONArgs = async (model: string, packageJSON: JSONSchema): Promise<Record<string, string | undefined>> => {
  const name = packageJSON.name;
  if (!name) {
    throw new Error(`No name defined for packageJSON for model ${model}`);
  }

  return {
    key: name.split("@upscalerjs/").pop(),
    description: `Overview of @upscalerjs/${model} model`,
    title: packageJSON['@upscalerjs']?.title,
    ...(await getSnippets(model)),
  };
};

const getKey = (match: string) => match.match(/<%(.*)%>/)?.[1].trim();

const getPreparedDoc = async (model: string) => {
  const packageJSON = await getPackageJSON(path.resolve(MODELS_DIR, model, 'package.json'));
  const modelFamily = getModelFamily(packageJSON);
  if (!modelFamily) {
    throw new Error(`No explicit model family defined in package JSON: ${model}`)
  }

  const sharedDoc = await getSharedDoc(modelFamily);
  const args = await getPackageJSONArgs(model, packageJSON);
  const matches = sharedDoc.matchAll(/<%.+?%>/g);
  const chunks: (string | undefined)[] = [];
  let start = 0;
  for (const match of matches) {
    const key = getKey(match[0]);
    if (key === undefined) {
      throw new Error(`An undefined key was returned from the match "${match[0]}" for model ${model}`);
    } else if (!(key in args)) {
      throw new Error(`Key "${key}" for model family ${modelFamily} and model ${model} was not found in args. Did you mean to prepend it with 'snippets/'? Args is: ${JSON.stringify(args, null, 2)}}`);
    } else if (typeof args[key] !== 'string') {
      throw new Error(`Key "${key}" for model family ${modelFamily} and model ${model} is not a string, it is: ${typeof args[key]}`)
    } else {
      const matchStart = match?.index ?? 0;
      const matchEnd = matchStart + (match[0]?.length ?? 0);
      
      chunks.push(sharedDoc.slice(start, matchStart));
      chunks.push(args[key])
      start = matchEnd;
    }
  }
  chunks.push(sharedDoc.slice(start));
  return chunks.join('');
}

/****
 * Main function
 */

const writeModelDocs = async (
  models: Array<string>,
) => {
  await Promise.all(models.map(async model => {
    const updatedDoc = await getPreparedDoc(model);
    const targetPath = path.resolve(MODELS_DIR, model, 'DOC.mdx');

    await readFile(targetPath);

    await writeFile(targetPath, updatedDoc);
  }));
}

const isDirectory = async (path: string) => (await stat(path)).isDirectory();

const isValidModel = async (modelDirectoryName: string) => {
  const modelDirectoryPath = path.resolve(MODELS_DIR, modelDirectoryName);
  return await exists(modelDirectoryPath) && await isDirectory(modelDirectoryPath);
};

const getModelDirectories = async () => {
  const modelDirectories: string[] = [];
  for (const modelDirectoryName of await readdir(MODELS_DIR)) {
    if (await isDirectory(path.resolve(MODELS_DIR, modelDirectoryName))) {
      modelDirectories.push(modelDirectoryName);
    }
  };
  return modelDirectories;
}

const expandModel = async (model: string): Promise<string[]> => {
  if (model.includes('*')) {
    const modelNameMatch = model.split('*')[0];
    const models: string[] = [];
    for (const modelDirectoryName of await getModelDirectories()) {
      if (modelDirectoryName.startsWith(modelNameMatch)) {
        models.push(modelDirectoryName);
      }
    }
    return models;
  }
  return [model];
};

const main = async () => {
  const {
    positionals: models,
  } = parseArgs({
    allowPositionals: true,
  });

  const validModels = new Set<string>();
  for (const modelName of models) {
    for (const model of await expandModel(modelName)) {
      if (await isValidModel(model)) {
        validModels.add(model);
      } else {
        warn(`Invalid model: ${model}`);
      }
    }
  };

  if (models.length === 0) {
    error('No models selected, nothing to do.')
    return;
  }


  info(`Writing model docs for models:\n${Array.from(validModels).map(m => `- ${m}`).join('\n')}`);
  await writeModelDocs(Array.from(validModels));
};

main();
