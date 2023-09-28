import _fsExtra from 'fs-extra';
import path from 'path';

const {
  writeFile: _writeFile,
  copyFile: _copyFile,
  mkdirp: _mkdirp,
  ...fsExtra
} = _fsExtra as typeof _fsExtra & {
  mkdirp: (pathname: string) => Promise<void>;
};

export const writeFile = async (pathname: string, contents: string, encoding: 'utf-8' | 'base64' = 'utf-8') => {
  await _mkdirp(path.dirname(pathname));
  await _writeFile(pathname, contents, encoding);
};

export const copyFile = async (srcpath: string, targetpath: string) => {
  await _mkdirp(path.dirname(targetpath));
  await _copyFile(srcpath, targetpath);
};

export const readFile = async (pathname: string) => {
  const contents = await fsExtra.readFile(pathname, 'utf-8');
  return contents;
};

export const exists = fsExtra.exists;
export const mkdirp = _mkdirp;
export const readdir = fsExtra.readdir;
export const stat = fsExtra.stat;
export const readFileSync = fsExtra.readFileSync;
export const unlink = fsExtra.unlink;
export const symlink = fsExtra.symlink;
export const copy = fsExtra.copy;
