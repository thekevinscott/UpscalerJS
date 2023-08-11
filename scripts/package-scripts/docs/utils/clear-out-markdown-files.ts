import { glob } from 'glob';
import { unlink } from 'fs-extra';

const getAllMarkdownFiles = (target: string) => glob(`${target}/**/*.md?(x)`);

export const clearOutMarkdownFiles = async (target: string) => {
  const files = await getAllMarkdownFiles(target);
  if (files.length > 0) {
    await Promise.all(files.map(file => unlink(file)));
    console.log([
      `Cleared out ${files.length} markdown files, including:`,
      ...files.map(file => file.split(/docs\/documentation\//gi).pop()).map(file => `- ${file}`),
    ].join('\n'));
  }
};
