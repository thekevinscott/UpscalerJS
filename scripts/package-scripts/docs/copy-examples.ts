import path from 'path';
import fs from 'fs';
import { mkdirp } from 'fs-extra';
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
const EXAMPLES_DOCS_DEST = path.resolve(DOCS_DIR, 'docs/usage');

/****
 * Utility functions
 */
const isDirectory = (root: string) => (folder: string) => fs.statSync(path.resolve(root, folder)).isDirectory();
const getExampleFolders = (root: string) => fs.readdirSync(root).filter(isDirectory(root));

const getFrontmatter = (src: string): FrontMatter => {
  const readmeContents = fs.readFileSync(src, 'utf-8').split('\n');
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
      const key = parts[0].trim();
      const val = parts[1].trim();
      if (key === 'category') {
        frontmatter[key] = val.charAt(0).toUpperCase() + val.slice(1);
      } else {
        frontmatter[key] = val;
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

/****
 * Main function
 */
const copyAllReadmes = async (src: string, dest: string) => {
  const examples = getExampleFolders(src);
  console.log('examples', examples);
  await mkdirp(dest)
  const exampleBits = examples.reduce((obj, example) => {
    return {
      ...obj,
      [example]: getFrontmatter(path.resolve(src, example, 'README.md')),
    };
  }, {} as Record<string, FrontMatter>);
  await Promise.all(examples.map(async (example) => {
    const readme = path.resolve(src, example, 'README.md');
    const { frontmatter: {
      category = 'Browser',
    } } = exampleBits[example];
    const categoryFolder = path.resolve(dest, category);
    await mkdirp(categoryFolder.toLowerCase());
    fs.copyFileSync(readme, path.resolve(categoryFolder, `${example}.md`))
  }));

  const examplesByCategory = examples.reduce((obj, example) => {
    const { frontmatter: { category = 'Browser' } } = exampleBits[example];
    return {
      ...obj,
      [category]: (obj[category] || []).concat(example),
    }
  }, {} as Record<string, Array<string>>);

  const content = `# Examples\n${Object.entries(examplesByCategory).map(([category, examples]) => {
    return `\n## ${category}\n\n${examples.map((example, i) => {
      const { title } = exampleBits[example];
      return `- [${title}](/docs/usage/${category}/${example})`;
    }).join('\n')}`;
  }).join('\n')}`

  fs.writeFileSync(path.resolve(dest, 'index.md'), content, 'utf-8');
}

/****
 * Functions to expose the main function as a CLI tool
 */

if (require.main === module) {
  (async () => {
    await copyAllReadmes(EXAMPLES_DIR, EXAMPLES_DOCS_DEST);
  })();
}
