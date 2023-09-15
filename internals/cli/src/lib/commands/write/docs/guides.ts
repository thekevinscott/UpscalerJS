import { EXAMPLES_DIR } from "@internals/common/constants";
import { copyFile, exists, mkdirp, readFile, readdir, stat, writeFile } from "@internals/common/fs";
import { getPackageJSON } from "@internals/common/package-json";
import path from "path";

/****
 * Types
 */
interface FrontMatter {
  [index: string]: string | number | FrontMatter;
}
interface ExampleContent {
  title: string;
  frontmatter: FrontMatter;
}
type Category = 'browser' | 'node' | 'other';

/****
 * Utility functions
 */
const DEFAULT_EMBED_FOR_NODE = 'codesandbox';
const DEFAULT_EMBED_FOR_BROWSER = 'codesandbox';
const isCategory = (category: unknown): category is Category => typeof category === 'string' && ['browser', 'node', 'other'].includes(category);
const getGuideFolders = async (root: string): Promise<string[]> => {
  const files = await readdir(root);
  const includedFiles: string[] = [];
  await Promise.all(files.map(async file => {
    const isDirectory = (await stat(path.resolve(root, file))).isDirectory();
    if (isDirectory) {
      includedFiles.push(file);
    }
  }));
  if (includedFiles.length === 0) {
    throw new Error('No guides found')
  }
  return includedFiles;
};

const getBody = (contents: string) => contents.split('---').pop() ?? '';

const getDefaultCodeEmbedParameters = (category: Category, params: Record<string, string> = {}) => {
  if (category === 'node') {
    return 'view=split,preview&module=index.js&hidenavigation=1';
  };
  return Object.entries({
    embed: 1,
    file: 'index.js',
    hideExplorer: 1,
    ...params,
  }).map(([key, val]) => `${key}=${val}`).join('&');
}

const getFrontmatter = async (key: string): Promise<ExampleContent> => {
  const packageJSON = await getPackageJSON(path.resolve(EXAMPLES_DIR, key, 'package.json'));
  const readmePath = path.resolve(EXAMPLES_DIR, key, 'README.md');
  const readmeContents = await readFile(readmePath);
  const body = getBody(readmeContents);
  const bodyParts = body.split('\n');
  let title: undefined | string;
  for (const line of bodyParts) {
    if (line.startsWith('#')) {
      title = line.split('#')?.pop()?.trim() ?? '';
      break;
    }
  }

  if (!title) {
    throw new Error(`No title found in file ${readmePath}`);
  }

  const {
    category = 'browser',
    code_embed,
    ...frontmatter
  } = packageJSON['@upscalerjs']?.guide?.frontmatter || {};

  const codeEmbed = code_embed !== false ? {
    params: getDefaultCodeEmbedParameters(category, frontmatter.params),
    type: category ? DEFAULT_EMBED_FOR_NODE : DEFAULT_EMBED_FOR_BROWSER,
    url: `/examples/${key}`,
    ...code_embed,
  } : {};

  return {
    frontmatter: {
      category,
      hide_table_of_contents: true,
      ...frontmatter,
      code_embed: codeEmbed,
    },
    title,
  }
};

const getGuidesWithFrontmatter = async (): Promise<({ key: string; } & ExampleContent)[]> => {
  const folders = await getGuideFolders(EXAMPLES_DIR);
  const includedFolders: string[] = [];
  await Promise.all(folders.map(async folder => {
    const readmePath = path.resolve(EXAMPLES_DIR, folder, 'README.md');
    if (await exists(readmePath)) {
      includedFolders.push(folder);
    }
  }))
  if (includedFolders.length === 0) {
    throw new Error('No guides found including a readme')
  }

  return Promise.all(includedFolders.map(async key => ({
    key,
    ...(await getFrontmatter(key)),
  })));
};

const getExampleOrder = (examples: ({ key: string; } & ExampleContent)[]) => {
  return examples.sort((a, b) => {
    const aPos = Number(a.frontmatter.sidebar_position);
    const bPos = Number(b.frontmatter.sidebar_position);
    if (Number.isNaN(aPos)) {
      return 1;
    }
    if (Number.isNaN(bPos)) {
      return -1;
    }
    return aPos - bPos;
  }).map(({ key }) => key);
}

const getExamplesByName = async () => {
  const examplesWithFrontmatter = await getGuidesWithFrontmatter();
  const exampleOrder = getExampleOrder(examplesWithFrontmatter);

  return {
    examplesByName: examplesWithFrontmatter.reduce((obj, { key, ...rest }) => {
      if (obj[key]) {
        throw new Error(`Example already exists for key ${key}`);
      }
      return {
        ...obj,
        [key]: rest,
      };
    }, {} as Record<string, ExampleContent>),
    exampleOrder,
  };
}

const indent = (str: string, depth = 0) => [...Array(depth * 2).fill(''), str].join(' ');
const uppercase = (str: string) => str[0].toUpperCase() + str.slice(1);

const buildFrontmatter = (frontmatter: FrontMatter = {}, depth = 0): string[] => Object.entries(frontmatter).reduce((arr, [key, val]) => {
  if (typeof val === 'object') {
    return arr.concat(...[
      `${key}:`, 
      ...buildFrontmatter(val, depth + 1),
    ].map(str => indent(str, depth)));
  }
  return arr.concat(indent(`${key}: ${val}`, depth));
}, [] as string[]);

const parseContents = async (key: string, frontmatter: FrontMatter = {}) => {
  const readmePath = path.resolve(EXAMPLES_DIR, key, 'README.md');
  const contents = await readFile(readmePath);
  const frontmatterContents = [
    ...buildFrontmatter(frontmatter),
  ];
  return [
    '---',
    ...frontmatterContents,
    '---',
    '',
    contents,
  ].filter(Boolean).join('\n');
}

const copyAssets = async (targetDir: string, key: string) => {
  const srcAssetsDir = path.resolve(EXAMPLES_DIR, key, 'assets');
  if (await exists(srcAssetsDir)) {
    const targetAssetsDir = path.resolve(targetDir, 'assets');
    await mkdirp(targetAssetsDir);
    const assets = await readdir(srcAssetsDir);
    await Promise.all(assets.map(async asset => {
      const assetPath = path.resolve(srcAssetsDir, asset);
      await copyFile(assetPath, path.resolve(targetAssetsDir, asset));
    }));
  }
}

const copyReadmesToDocs = async (exampleOrder: string[], examplesByName: Record<string, ExampleContent>, dest: string) => {
  await Promise.all(exampleOrder.map(async (key) => {
    const example = examplesByName[key];
    if (!example) {
      throw new Error(`No example found for key ${key}`);
    }
    const {
      frontmatter,
    } = example;

    const {
      parent,
      category,
    } = frontmatter;
    if (!isCategory(category)) {
      throw new Error(`Category is not valid: ${category}, for key ${key}`);
    }
    if (parent !== undefined && typeof parent !== 'string') {
      throw new Error(`Parent is not of type string: ${parent}`);
    }
    const targetDir = path.resolve(...[dest, category, parent].filter(Boolean));

    // copy assets
    await copyAssets(targetDir, key);

    // write readme
    const targetPath = path.resolve(targetDir, `${key}.md`);
    await mkdirp(path.dirname(targetPath));
    const fileContents = await parseContents(key, frontmatter);
    await writeFile(targetPath, fileContents);
  }));
}

const writeIndexFile = async (exampleOrder: string[], examplesByName: Record<string, ExampleContent>, dest: string) => {
  const examplesByCategory = exampleOrder.reduce((obj, example) => {
    const { frontmatter: { parent, category } } = examplesByName[example];
    if (!isCategory(category)) {
      throw new Error(`Category is not valid: ${category}, for key ${example}`);
    }
    if (parent !== undefined && typeof parent !== 'string') {
      throw new Error(`Parent is not of type string: ${parent}`);
    }
    return {
      ...obj,
      [category]: (obj[category] || []).concat([[parent ? uppercase(parent) : undefined, example]]),
    }
  }, {} as Record<string, Array<[undefined | string, string]>>);

  const content = [
    '---',
    'hide_table_of_contents: true',
    '---',
    '# Guides',
    'This page contains a list of guides and examples for using various features of UpscalerJS.',
    '',
    'The first two guides discuss the basics of UpscalerJS and how to use it in a project. The [Models](browser/models) and [Working with Tensors](browser/tensors) guides discuss useful configuration options of UpscalerJS.',
    '',
    'There are also guides on [improving the performance](#performance) of UpscalerJS, [specific examples of implementations](#implementations), and [Node.js-specific](#node) guides.',
    '',
    ...Object.entries(examplesByCategory).map(([category, examples]) => {
      let activeParent: undefined | string;
      return `\n## ${uppercase(category)}\n\n${examples.map(([parent, example]) => {
        const { title } = examplesByName[example];
        const url = [
          '/documentation',
          'guides',
          category,
          parent,
          example
        ].filter(Boolean).join('/');
        const strings: string[] = [];
        if (activeParent !== parent) {
          activeParent = parent;
          strings.push(`- ### ${parent}`);
        }
        strings.push(indent(`- [${title}](${url})`, activeParent ? 1 : 0));
        return strings.join('\n');
      }).join('\n')}`;
    }),
  ].join('\n');

  await writeFile(path.resolve(dest, 'index.md'), content);
}

export const writeGuideDocs = async (dest: string) => {
  const { exampleOrder, examplesByName } = await getExamplesByName();

  await Promise.all([
    copyReadmesToDocs(exampleOrder, examplesByName, dest),
    writeIndexFile(exampleOrder, examplesByName, dest),
  ]);
}
