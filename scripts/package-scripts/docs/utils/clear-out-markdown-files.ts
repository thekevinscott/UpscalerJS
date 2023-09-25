import { glob } from 'glob';
import fsExtra from 'fs-extra';
const { unlink } = fsExtra;

const getAllMarkdownFiles = (target: string) => glob(`${target}/**/*.md?(x)`);

export const clearOutMarkdownFiles = async (target: string, verbose?: boolean) => {
  const files = await getAllMarkdownFiles(target);
  if (files.length > 0) {
    await Promise.all(files.map(file => unlink(file)));
    if (verbose) {
      console.log([
        `Cleared out ${files.length} markdown files, including:`,
        ...files.map(file => file.split(/docs\/documentation\//gi).pop()).map(file => `- ${file}`),
      ].join('\n'));
    }
  }
};
