import { transformAsync } from '@babel/core';
import { writeFile, readFile } from '@internals/common/fs';
import { getAllFilesRecursively } from './get-all-files-recursively.js';

export const babelTransform = async (directory: string) => {
  const files = getAllFilesRecursively(directory, file => file.endsWith('.js'));

  await Promise.all(files.map(async filePath => {
    const contents = await readFile(filePath);
    const transformedCode = await transformAsync(contents, {
      plugins: [
        "@babel/plugin-transform-modules-commonjs",
        "babel-plugin-add-module-exports",
        "@babel/plugin-proposal-export-namespace-from",
      ],
    });
    await writeFile(filePath, transformedCode?.code ?? '');
  }));
};
