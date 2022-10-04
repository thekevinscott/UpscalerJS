import path from 'path';
import crypto from 'crypto';
import { mkdirpSync, readdirSync, readFileSync, writeFileSync } from "fs-extra";
import imageSize from 'image-size';
import util from 'util';
import callExec from '../../../../../test/lib/utils/callExec';

const sizeOf = util.promisify(imageSize);

export function getFiles(dir: string): string[] {
  const dirents = readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const dirent of dirents) {
    if (dirent.isDirectory()) {
      for (const filename of getFiles(path.resolve(dir, dirent.name))) {
        files.push(path.join(dirent.name, filename));
      }
    } else {
      const ext = dirent.name.split('.').pop();
      if (typeof ext === 'string' && ['jpg', 'jpeg', 'png'].includes(ext)) {
        files.push(dirent.name);
      }
    }
  }
  return files.sort();
}

export const getHashedFilepath = (data: string) => `${crypto.createHash('md5').update(data).digest("hex")}.png`;

export const getDims = (fn: (size: number) => number, ...nums: number[]) => {
  const result = nums.map(fn);
  for (const r of result) {
    if (Number.isNaN(r)) {
      throw new Error(`Part of result is NaN: ${result} | original nums: ${nums}`)
    }
  }
  return result;
};

export const checkIntegers = (key: string, ...nums: number[]) => {
  for (const num of nums) {
    if (num !== Math.round(num)) {
      throw new Error(`Key: ${key} | Sizes are not integers: ${nums.join(' x ')}`);
    }
  }
};

export const saveFile = (filePath: string, data: Buffer) => {
  mkdirpSync(path.dirname(filePath));
  writeFileSync(filePath, data);
  return filePath;
}

export const avg = (arr: number[]) => arr.reduce((sum, num) => sum + num, 0) / arr.length;

export const getSize = async (file: string): Promise<{ width: number; height: number }> => {
  const dimensions = await sizeOf(file);
  if (!dimensions?.width || !dimensions?.height) {
    throw new Error(`No dimensions found for file ${file}.`)
  }
  return { width: dimensions.width, height: dimensions.height };
}

export const getHash = (file: string) => {
  const fileBuffer = readFileSync(file);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);

  return hashSum.digest('hex');
};

export const runScript = async (cmd: string) => {
  let stdout = '';
  let stderr = '';
  let err: unknown = '';
  try {
    await callExec(cmd, {}, _data => {
      stdout += _data;
    }, _data => {
      stderr += _data;
    });
  } catch (_err) {
    err = _err;
  }
  return [stdout, stderr, err];
};
