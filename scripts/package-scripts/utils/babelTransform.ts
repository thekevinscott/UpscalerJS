import { transformAsync } from '@babel/core';
import fs from 'fs';
import { getAllFilesRecursively } from "./getAllFilesRecursively";

export const babelTransform = async (directory: string) => {
  const files = getAllFilesRecursively(directory, file => file.endsWith('.js'));

  await Promise.all(files.map(async filePath => {
    const contents = fs.readFileSync(filePath, 'utf-8');
    const transformedCode = await transformAsync(contents, {
      plugins: [
        "@babel/plugin-transform-modules-commonjs",
        "babel-plugin-add-module-exports",
        "@babel/plugin-proposal-export-namespace-from",
      ],
    });
    fs.writeFileSync(filePath, transformedCode?.code || '');
  }));
};
