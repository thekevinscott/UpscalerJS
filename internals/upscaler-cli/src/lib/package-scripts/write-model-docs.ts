import { existsSync, readdirSync, readFile, readFileSync, writeFile } from 'fs-extra';
import path from 'path';
import yargs from 'yargs';
import { ifDefined as _ifDefined } from './prompt/ifDefined';
import { AVAILABLE_MODELS, getModel } from './prompt/getModel';
import { SHARED_DIR, MODELS_DIR } from './utils/constants';
import { getPackageJSON, JSONSchema } from './utils/packages';

/***
 * Types
 */

interface Opts {
  verbose?: boolean;
}

/****
 * Utility functions
 */

const getModelFamily = (packageJSON: JSONSchema) => {
  return packageJSON['@upscalerjs']?.['modelFamily'];
};

const getSharedDoc = async (modelFamily: string) => {
  const sharedDoc = path.resolve(SHARED_DIR, 'src', modelFamily, 'DOC.mdx');
  if (!existsSync(sharedDoc)) {
    throw new Error(`File does not exist: ${sharedDoc}`)
  }
  return await readFile(sharedDoc, 'utf-8');
};

const getSnippets = (model: string): Record<string, string> => {
  const snippets: Record<string, string> = {};
  const docSnippetsPath = path.resolve(MODELS_DIR, model, 'doc-snippets');
  if (!existsSync(docSnippetsPath)) {
    throw new Error(`doc snippets folder does not exist at "${docSnippetsPath}"`)
  }
  const snippetPaths = readdirSync(docSnippetsPath);

  for (const snippetPath of snippetPaths) {
    const snippet = readFileSync(path.resolve(docSnippetsPath, snippetPath), 'utf-8') || '';
    const snippetKey = snippetPath.split('.').slice(0, -1).join('.');
    if (typeof snippetKey !== 'string') {
      throw new Error(`Bad snippet key: ${snippetKey}`)
    }
    snippets[`snippets/${snippetKey}`] = snippet.trim();
  }
  return snippets;

}

const getPackageJSONArgs = (model: string, packageJSON: JSONSchema): Record<string, any> => {
  const name = packageJSON.name;
  if (!name) {
    throw new Error(`No name defined for packageJSON for model ${model}`);
  }
  return {
    key: name.split("@upscalerjs/").pop(),
    description: `Overview of @upscalerjs/${model} model`,
    title: packageJSON['@upscalerjs']?.title,
    ...getSnippets(model)
  };
};

const getKey = (match: string) => match.match(/<%(.*)%>/)?.[1].trim();

const getPreparedDoc = async (model: string, { verbose }: Opts) => {
  const packageJSON = getPackageJSON(path.resolve(MODELS_DIR, model, 'package.json'));
  const modelFamily = getModelFamily(packageJSON);
  if (!modelFamily) {
    throw new Error(`No explicit model family defined in package JSON: ${model}`)
  }

  const sharedDoc = await getSharedDoc(modelFamily);
  const args = getPackageJSONArgs(model, packageJSON);
  const matches = sharedDoc.matchAll(/\<\%.+?\%\>/g);
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
      const matchStart = match?.index || 0;
      const matchEnd = matchStart + (match[0]?.length || 0);
      
      chunks.push(sharedDoc.slice(start, matchStart));
      chunks.push(args[key])
      start = matchEnd;

      if (verbose) {
        console.log(
          `Found ${match[0]} (${key}) start=${match?.index} end=${(match?.index || 0) + match[0]?.length
          }.`,
        );
      }
    }
  }
  chunks.push(sharedDoc.slice(start));
  return chunks.join('');
}

/****
 * Main function
 */

const writeModelDocs = async (
  models: Array<string> = AVAILABLE_MODELS, 
  {
    verbose = false,
  }: Opts = {},
) => {
  if (models.length === 0) {
    console.log('No models selected, nothing to do.')
    return;
  }

  await Promise.all(models.map(async model => {
    const updatedDoc = await getPreparedDoc(model, { verbose });
    const targetPath = path.resolve(MODELS_DIR, model, 'DOC.mdx');

    await readFile(targetPath, 'utf-8');

    await writeFile(targetPath, updatedDoc);
  }));
}

export default writeModelDocs;

/****
 * Functions to expose the main function as a CLI tool
 */

interface Answers extends Opts { 
  models: Array<string>;
}

const getArgs = async (): Promise<Answers> => {
  const argv = await yargs.command('build models', 'build models', yargs => {
    yargs.positional('model', {
      describe: 'The model to build',
      array: true,
    }).option('v', {
      alias: 'verbose',
      type: 'boolean',
    });
  })
    .help()
    .argv;

  const models = await getModel(argv._, argv.model);

  function ifDefined<T>(key: string, type: string) { return _ifDefined(argv, key, type) as T; }

  return {
    models,
    verbose: ifDefined('v', 'boolean'),
  }
}

if (require.main === module) {
  (async () => {
    const { models, ...opts } = await getArgs();
    await writeModelDocs(models, opts);
  })();
}
