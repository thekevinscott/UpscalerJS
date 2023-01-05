import path from 'path';
import { existsSync, mkdirp, readdirSync, readFile, readFileSync, statSync, unlink, writeFile } from 'fs-extra';
import { DOCS_DIR, EXAMPLES_DIR } from '../utils/constants';
import { JSONSchema } from '../utils/packages';
import { writeFileSync } from 'fs';
import fm from 'front-matter';
import { clearOutMarkdownFiles } from './utils/clear-out-markdown-files';

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

/****
 * Constants
 */
const EXAMPLES_DOCS_DEST = path.resolve(DOCS_DIR, 'docs/documentation/guides');

/****
 * Utility functions
 */
const isDirectory = (root: string) => (folder: string) => statSync(path.resolve(root, folder)).isDirectory();
const getExampleFolders = (root: string) => readdirSync(root).filter(isDirectory(root));

const getDefaultCodeEmbedParameters = (category: string) => {
  if (category.toLowerCase() === 'node') {
    return 'view=split,preview&module=index.js&hidenavigation=1';
  };
  return 'embed=1&file=index.js&hideExplorer=1';
}

const getFrontmatter = (key: string): ExampleContent => {
  const packageJSON = JSON.parse(readFileSync(path.resolve(EXAMPLES_DIR, key, 'package.json'), 'utf-8')) as JSONSchema;
  const readmePath = path.resolve(EXAMPLES_DIR, key, 'README.md');
  const readmeContents = readFileSync(readmePath, 'utf-8');
  const { body } = fm(readmeContents);
  const bodyParts = body.split('\n');
  let title: undefined | string;
  for (let i = 0; i < bodyParts.length; i++) {
    const line = bodyParts[i];
    if (line.startsWith('#')) {
      title = line.split('#')?.pop()?.trim() || '';
      break;
    }
  }

  if (!title) {
    throw new Error(`No title found in file ${readmePath}`);
  }

  const {
    category = 'Browser',
    code_embed,
    ...frontmatter
  } = packageJSON['@upscalerjs']?.guide?.frontmatter || {};

  return {
    frontmatter: {
      category: category.toLowerCase() === 'node' ? 'Node' : 'Browser',
      hide_table_of_contents: true,
      ...frontmatter,
      code_embed: {
        params: getDefaultCodeEmbedParameters(category),
        type: category.toLowerCase() === 'node' ? 'codesandbox' : 'stackblitz',
        url: `/examples/${key}`,
        ...code_embed,
      },
    },
    title,
  }
};

const getExamplesWithFrontmatter = (): ({ key: string; } & ExampleContent)[] => getExampleFolders(EXAMPLES_DIR).filter(key => {
  const readmePath = path.resolve(EXAMPLES_DIR, key, 'README.md');
  return existsSync(readmePath);
}).map(key => {
  return {
    key,
    ...getFrontmatter(key),
  };
});

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

const getExamplesByName = () => {
  const examplesWithFrontmatter = getExamplesWithFrontmatter();
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
  const contents = await readFile(readmePath, 'utf-8');
  const frontmatterContents = [
    ...buildFrontmatter(frontmatter),
  ];
  return [
    '---',
    ...frontmatterContents,
    '---',
    contents,
  ].filter(Boolean).join('\n');
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
      category = 'Browser',
    } = frontmatter;
    if (typeof category !== 'string') {
      throw new Error(`Category is not of type string ${category}`);
    }
    if (parent !== undefined && typeof parent !== 'string') {
      throw new Error(`Parent is not of type string: ${parent}`);
    }
    const targetPath = path.resolve(...[dest, category.toLowerCase(), parent, `${key}.md`].filter(Boolean));
    await mkdirp(path.dirname(targetPath));
    const fileContents = await parseContents(key, frontmatter);
    await writeFile(targetPath, fileContents, 'utf-8');
  }));
}

const writeIndexFile = async (exampleOrder: string[], examplesByName: Record<string, ExampleContent>, dest: string) => {
  const examplesByCategory = exampleOrder.reduce((obj, example) => {
    const { frontmatter: { parent, category = 'Browser' } } = examplesByName[example];
    if (typeof category !== 'string') {
      throw new Error(`Category is not of type string: ${category}`);
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
    `# Guides`,
    `This page contains a list of guides and examples for using various features of UpscalerJS.`,
    ``,
    `The first two guides discuss the basics of UpscalerJS and how to use it in your project. The [Models](browser/models) and [Working with Tensors](browser/tensors) guides discuss useful configuration options of UpscalerJS.`,
    ``,
    `There are also guides on [improving the performance](#performance) of UpscalerJS, [specific examples of implementations](#implementations), and [Node.js-specific](#node) guides.`,
    ``,
    ...Object.entries(examplesByCategory).map(([category, examples]) => {
      let activeParent: undefined | string;
      return `\n## ${category}\n\n${examples.map(([parent, example], i) => {
        const { title } = examplesByName[example];
        const url = [
          '/documentation',
          'guides',
          category.toLowerCase(),
          parent,
          example
        ].filter(Boolean).join('/');
        let strings: string[] = [];
        if (activeParent !== parent) {
          activeParent = parent;
          strings.push(`- ### ${parent}`);
        }
        strings.push(indent(`- [${title}](${url})`, activeParent ? 1 : 0));
        return strings.join('\n');
      }).join('\n')}`;
    }),
  ].join('\n');

  await writeFile(path.resolve(dest, 'index.md'), content, 'utf-8');
}

/****
 * Main function
 */
export const buildGuides = async (src: string, dest: string) => {
  await mkdirp(dest)
  await clearOutMarkdownFiles(dest);
  const { exampleOrder, examplesByName } = getExamplesByName();

  await Promise.all([
    copyReadmesToDocs(exampleOrder, examplesByName, dest),
    writeIndexFile(exampleOrder, examplesByName, dest),
  ]);
}

/****
 * Functions to expose the main function as a CLI tool
 */

if (require.main === module) {
  (async () => {
    await buildGuides(EXAMPLES_DIR, EXAMPLES_DOCS_DEST);
  })();
}
