import glob from 'glob';
import { unlink } from 'fs-extra';

const getAllMarkdownFiles = (target: string) => new Promise<string[]>((resolve, reject) => {
  glob(`${target}/**/*.md?(x)`, (err, files) => {
    if (err) {
      reject(err);
    } else {
      resolve(files);
    }
  });
});

export const clearOutMarkdownFiles = async (target: string) => {
  const files = await getAllMarkdownFiles(target);
  await Promise.all(files.map(file => unlink(file)));
  console.log([
    `Cleared out ${files.length} markdown files, including:`,
    ...files.map(file => file.split(/docs\/documentation\//gi).pop()).map(file => `- ${file}`),
  ].join('\n'));
};

