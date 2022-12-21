import path from 'path';
import glob from 'glob';
import { mkdirp, readdirSync, readFile, readFileSync, statSync, unlink, writeFile } from 'fs-extra';
import { DOCS_DIR, EXAMPLES_DIR } from '../utils/constants';

/****
 * Types
 */
interface FrontMatter {
  title: string;
  frontmatter: Record<string, string>;
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

const getFrontmatter = (src: string): FrontMatter => {
  const readmeContents = readFileSync(src, 'utf-8').split('\n');
  let title: string = '';
  let seenFrontmatter = false;
  let isFrontmatter = false;
  const frontmatter: Record<string, string> = {};
  for (let i = 0; i < readmeContents.length; i++) {
    const line = readmeContents[i];
    if (line === '---') {
      if (seenFrontmatter === false) {
        isFrontmatter = true;
        seenFrontmatter = true;
      } else {
        isFrontmatter = false;
      }
    } else if (isFrontmatter) {
      const parts = line.split(':');
      if (parts.length === 2) {
        const key = parts[0].trim();
        const val = parts[1].trim();
        if (key === 'category') {
          frontmatter[key] = val.charAt(0).toUpperCase() + val.slice(1);
        } else {
          frontmatter[key] = val;
        }
      }
    } else if (!title && line.startsWith('#')) {
      title = line.split('#')?.pop()?.trim() || '';
    }
  }

  if (!title) {
    throw new Error(`No title found in file ${src}`)
  }
  return {
    title,
    frontmatter,
  }
}

const getExamplesWithFrontmatter = (): ({ key: string; readmePath: string } & FrontMatter)[] => getExampleFolders(EXAMPLES_DIR).map(key => {
  const readmePath = path.resolve(EXAMPLES_DIR, key, 'README.md');
  return {
    key,
    readmePath,
    ...getFrontmatter(readmePath),
  };
});

const getExampleOrder = (examples: ({ key: string; } & FrontMatter)[]) => {
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
    }, {} as Record<string, ({ readmePath: string; } & FrontMatter)>),
    exampleOrder,
  };
}

const parseContents = async (path: string) => {
  const contents = await readFile(path, 'utf-8');
  return contents;
}

const copyReadmesToDocs = async (exampleOrder: string[], examplesByName: Record<string, ({ readmePath: string; } & FrontMatter)>, dest: string) => {
  await Promise.all(exampleOrder.map(async (key) => {
    const example = examplesByName[key];
    if (!example) {
      throw new Error(`No example found for key ${key}`);
    }
    const {
      readmePath,
      frontmatter: {
        parent,
        category = 'Browser',
      },
    } = example;
    const targetPath = path.resolve(...[dest, category.toLowerCase(), parent, `${key}.md`].filter(Boolean));
    await mkdirp(path.dirname(targetPath));
    const fileContents = await parseContents(readmePath)
    await writeFile(targetPath, fileContents, 'utf-8');
  }));
}

const writeIndexFile = async (exampleOrder: string[], examplesByName: Record<string, ({ readmePath: string; } & FrontMatter)>, dest: string) => {
  const examplesByCategory = exampleOrder.reduce((obj, example) => {
    const { frontmatter: { parent, category = 'Browser' } } = examplesByName[example];
    return {
      ...obj,
      [category]: (obj[category] || []).concat([[parent, example]]),
    }
  }, {} as Record<string, Array<[undefined | string, string]>>);

  const content = `# Guides\n${Object.entries(examplesByCategory).map(([category, examples]) => {
    let activeParent: undefined | string;
    return `\n## ${category}\n\n${examples.map(([parent, example], i) => {
      const { title } = examplesByName[example];
      const url = [
        'documentation',
        'guides',
        category.toLowerCase(),
        parent,
        example
      ].filter(Boolean).join('/');
      let strings: string[] = [];
      if (activeParent !== parent) {
        activeParent = parent;
        strings.push(`- [${parent}]`);
      }
      strings.push(`${activeParent ? '  ' : ''}- [${title}](${url})`);
      return strings.join('\n');
    }).join('\n')}`;
  }).join('\n')}`

  await writeFile(path.resolve(dest, 'index.md'), content, 'utf-8');
}

const getAllMarkdownFiles = (target: string) => new Promise<string[]>((resolve, reject) => {
  glob(`${target}/**/*.md?(x)`, (err, files) => {
    if (err) {
      reject(err);
    } else {
      resolve(files);
    }
  });
});

const clearOutMarkdownFiles = async (target: string) => {
  const files = await getAllMarkdownFiles(target);
  await Promise.all(files.map(file => unlink(file)));
  console.log(`Cleared out ${files.length} markdown files, including ${JSON.stringify(files.map(file => file.split(/upscalerjs\/docs/gi).pop()))}`);
};

/****
 * Main function
 */
const copyAllReadmes = async (src: string, dest: string) => {
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
    await copyAllReadmes(EXAMPLES_DIR, EXAMPLES_DOCS_DEST);
  })();
}
