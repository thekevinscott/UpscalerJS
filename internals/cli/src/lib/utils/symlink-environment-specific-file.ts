import path from 'path';
import { TFJSLibrary } from "@internals/common/types";
import { exists, unlink, symlink } from '@internals/common/fs';

export const getFilePath = (file: string, platform: TFJSLibrary) => `${file}.${platform === 'browser' ? 'browser' : 'node'}.ts`;

export const symlinkEnvironmentSpecificFile = async (src: string, filename: string, tfjsLibrary: TFJSLibrary): Promise<string> => {
  const file = filename.split('.').slice(0, -2).join('.');
  const srcFile = path.resolve(src, getFilePath(file, tfjsLibrary));
  if (!await exists(srcFile)) {
    throw new Error(`File ${srcFile} does not exist`)
  }
  const targetFileName = `${file}.generated.ts`;
  const targetFile = path.resolve(src, targetFileName);
  if (await exists(targetFile)) {
    await unlink(targetFile);
  }
  await symlink(srcFile, targetFile, 'file');
  return targetFileName;
};
