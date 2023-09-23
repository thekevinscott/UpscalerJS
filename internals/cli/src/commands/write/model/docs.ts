import {Args, Flags} from '@oclif/core';
import path from 'path';
import asyncPool from 'tiny-async-pool';
import { MODELS_DIR, SHARED_DIR } from '@internals/common/constants';
import { JSONSchema, getPackageJSON } from '@internals/common/package-json';
import { exists, readFile, readdir, writeFile } from '@internals/common/fs';
import { info, verbose } from '@internals/common/logger';
import { validateModels } from '../../../lib/commands/validate-models.js';
import { collectVariadicArgs } from '../../../lib/utils/collect-variadic-args.js';
import { BaseCommand } from '../../../lib/utils/base-command.js';

const CONCURRENT_ASYNC_THREADS = 5;

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
  if (!exists(docSnippetsPath)) {
    throw new Error(`doc snippets folder does not exist at "${docSnippetsPath}"`)
  }
  const snippetPaths = await readdir(docSnippetsPath);

  await Promise.all(snippetPaths.map(async (snippetPath) => {
    const snippet = (await readFile(path.resolve(docSnippetsPath, snippetPath))) ?? '';
    const snippetKey = snippetPath.split('.').slice(0, -1).join('.');
    if (typeof snippetKey !== 'string') {
      throw new Error(`Bad snippet key: ${snippetKey}`)
    }
    snippets[`snippets/${snippetKey}`] = snippet.trim();
  }));
  return snippets;

}

const getPackageJSONArgs = async (model: string, packageJSON: JSONSchema): Promise<Record<string, string | undefined>> => {
  const name = packageJSON.name;
  if (!name) {
    throw new Error(`No name defined for packageJSON for model ${model}`);
  }
  return {
    key: name.split("@upscalerjs/").pop(),
    description: `Overview of @upscalerjs/${model} model`,
    title: packageJSON['@upscalerjs']?.title,
    ...(await getSnippets(model))
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
  const chunks: string[] = [];
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
      chunks.push(args[key] ?? '');
      start = matchEnd;

      verbose(
        `Found ${match[0]} (${key}) start=${match?.index} end=${matchStart + match[0]?.length
        }.`,
      );
    }
  }
  chunks.push(sharedDoc.slice(start));
  return chunks.join('');
}

const writeModelDoc = async (modelPackageDirectoryName: string) => {
  info(`Writing docs for ${modelPackageDirectoryName}`)
  const updatedDoc = await getPreparedDoc(modelPackageDirectoryName);
  const targetPath = path.resolve(MODELS_DIR, modelPackageDirectoryName, 'DOC.mdx');

  await readFile(targetPath);

  await writeFile(targetPath, updatedDoc);
};

export const writeModelDocs = async (modelPackageDirectoryNames: string[]) => {
  for await (const _ of asyncPool(
    CONCURRENT_ASYNC_THREADS,
    modelPackageDirectoryNames,
    (modelPackageDirectoryName: string) => writeModelDoc(modelPackageDirectoryName)
  )) {
    // empty
  }
  info(`Wrote docs for ${modelPackageDirectoryNames.length} package${modelPackageDirectoryNames.length === 1 ? '' : 's'}`)
};

export default class WriteModelDocs extends BaseCommand<typeof WriteModelDocs> {
  static description = 'Write docs for a model'

  static strict = false;

  static args = {
    model: Args.string({description: 'The model package to build. Must be a valid model in the /models folder', required: true}),
  }

  static flags = {
    validateModelsFolder: Flags.boolean({char: 'v', description: 'Whether to validate the existence of the models folder', default: false}),
  }

  async run(): Promise<void> {
    const { flags: { validateModelsFolder } } = await this.parse(WriteModelDocs);
    const _models = collectVariadicArgs(this.argv);
    const models = await validateModels(_models, { validateModelsFolder });
    return writeModelDocs(models);
  }
}
