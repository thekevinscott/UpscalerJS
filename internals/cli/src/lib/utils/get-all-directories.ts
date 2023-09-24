import path from 'path';
import fsExtra from "fs-extra";
const { readdir, stat } = fsExtra;

export const getAllDirectories = async (rootDir: string) => {
  const directories: string[] = [];
  const files = await readdir(rootDir);
  await Promise.all(files.map(async file => {
    const stats = await stat(path.resolve(rootDir, file));
    if (stats.isDirectory()) {
      directories.push(file);
    }
  }));
  return directories;
};
