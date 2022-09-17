import yargs from 'yargs';
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs';
import * as tf from '@tensorflow/tfjs-node';
import imageSize from 'image-size';
import util from 'util';
import sharp from 'sharp';
import callExec from '../../../test/lib/utils/callExec';
import { mkdirp, mkdirpSync } from 'fs-extra';
import { makeTmpDir } from '../utils/withTmpDir';
import { ModelDefinition } from '@upscalerjs/core';
import nqdm from 'nqdm';
import { getString } from '../prompt/getString';
const Upscaler = require('upscaler/node');
const sizeOf = util.promisify(imageSize);
const writeFile = util.promisify(fs.writeFile);

/****
 * Constants
 */
const ROOT_DIR = path.resolve(__dirname, '../../..');

/****
 * Types
 */
interface BenchmarkResult {
  ssim: number;
  psnr: number;
}

interface ImageData {
  original: {
    path: string;
    data: Buffer;
    width: number;
    height: number;
  }
  downscaled: {
    data: Buffer;
    width: number;
    height: number;
  };
  file: string;
}

/****
 * Utility Functions & Classes
 */

const avg = (arr: number[]) => arr.reduce((sum, num) => sum + num, 0) / arr.length;

const getSize = async (file: string): Promise<{ width: number; height: number }> => {
  const dimensions = await sizeOf(file);
  if (!dimensions?.width || !dimensions?.height) {
    throw new Error(`No dimensions found for file ${file}.`)
  }
  return { width: dimensions.width, height: dimensions.height };
}

const checkImagemagickInstallation = async () => {
  try {
    await callExec('convert -version');
  } catch (err) {
    throw new Error('Imagemagick does not appear to be installed. Please install it for your system.');
  }
}

const getFilename = (file: string): string => {
  const filename = file.split('/').pop();
  if (!filename) {
    throw new Error(`Bad file path provided: ${file}`);
  }
  return filename;
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

class Image {
  file: string;
  data = new Map<number, ImageData>();
  size: Promise<{ width: number; height: number; }>;
  tmpDir: string;

  constructor(file: string, tmpDir: string) {
    this.tmpDir = tmpDir;
    this.file = file;
    this.size = getSize(file);
  }

  async prepare(scale: number): Promise<ImageData> {
    const file = this.file;
    const { width, height } = await this.size;
    const croppedWidth = Math.floor(width / scale) * scale;
    const croppedHeight = Math.floor(height / scale) * scale;
    const originalImage = await sharp(file)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize({ width: croppedWidth, height: croppedHeight, fit: 'cover' })
      .toBuffer();

    const originalsFolder = path.resolve(this.tmpDir, 'originals');
    mkdirpSync(originalsFolder);
    const originalFilePath = path.resolve(originalsFolder, getFilename(this.file));
    fs.writeFileSync(originalFilePath, originalImage);

    const downscaledWidth = croppedWidth / scale;
    const downscaledHeight = croppedHeight / scale;
    const downscaledImage = await sharp(originalImage)
      .resize({ width: downscaledWidth, height: downscaledHeight })
      .toBuffer();

    return {
      original: {
        path: originalFilePath,
        data: originalImage,
        width: croppedWidth,
        height: croppedHeight,
      },
      downscaled: {
        data: downscaledImage,
        width: downscaledWidth,
        height: downscaledHeight,
      },
      file,
    };
  }

  async get(scale: number): Promise<ImageData> {
    if (!this.data.has(scale)) {
      const data = await this.prepare(scale);
      this.data.set(scale, data);
    }

    return this.data.get(scale)!;
  }
}

class Dataset {
  folder: string;
  images = new Map<string, Image>();
  files: string[];
  tmpDir: string;

  constructor(folder: string, tmpDir: string) {
    this.tmpDir = tmpDir;
    this.folder = folder;
    this.files = fs.readdirSync(this.folder).sort();
  }

  async * get(scale: number) {
    const { files } = this;
    for(const i of nqdm(files.length)) {
      const file = path.resolve(this.folder, files[i]);
      if (!this.images.has(file)) {
        this.images.set(file, new Image(file, this.tmpDir));
      }
      const image = this.images.get(file);
      const data = await image!.get(scale);
      yield data;
    }
  }
}

class Benchmarker {
  n: number;

  private models: Map<string, Promise<typeof Upscaler>>;
  private datasets: Map<string, Dataset>;

  private tmpDir: string = '';

  constructor(models: string[], datasets: string[], n: number = Infinity) {
    this.n = n;
    this.models = new Map();
    this.datasets = new Map();
    this.tmpDir = makeTmpDir();

    for (const modelName of models) {
      const pathToModel = path.resolve(ROOT_DIR, 'models', modelName);
      this.models.set(modelName, import(pathToModel).then(model => new Upscaler(model)));
    }
    datasets.forEach(dataset => {
      this.datasets.set(dataset, new Dataset(dataset, this.tmpDir));
    });
    this.benchmark();
  }

  private async upscale(_upscaler: Promise<typeof Upscaler>, downscaled: Buffer, file: string): Promise<Buffer> {
    const upscaler = await _upscaler;
    const upscaledData = await upscaler.upscale(downscaled, {
      output: 'tensor',
      patchSize: 64,
      padding: 2,
      // progress: (rate: number) => console.log(rate, file),
    });
    const data = await tf.node.encodePng(upscaledData);
    return Buffer.from(data);
  }

  private async calculatePerformance(upscaledPath: string, originalPath: string, diffPath: string, metric: 'ssim' | 'psnr'): Promise<number> {
    const [_, out,] = await runScript(`magick compare -metric ${metric} ${upscaledPath} ${originalPath} ${diffPath}`);
    if (typeof out !== 'string') {
      throw new Error('No response from metric calculation');
    }
    const value = out.split(' ')[0];
    if (!value) {
      throw new Error('No metric found')
    }
    return parseFloat(value);
  }

  private async benchmark() {
    const { n } = this;
    const upscaledFolder = path.resolve(this.tmpDir, 'upscaled');
    const diffFolder = path.resolve(this.tmpDir, 'diff');
    await Promise.all([
      mkdirp(upscaledFolder),
      mkdirp(diffFolder),
    ]);
    const results = new Map<{ dataset: Dataset; modelDefinition: ModelDefinition }, BenchmarkResult>();
    for (const [datasetName, dataset] of this.datasets) {
      for (const [modelName, _model] of this.models) {
        const model = await _model;
        const { modelDefinition } = await model.getModel();
        let localN = n;
        const get = dataset.get(modelDefinition.scale);
        let r = await get.next();
        const ssim: number[] = [];
        const psnr: number[] = [];

        while (!r.done && localN > 0) {
          const { 
            original: {
              path: originalPath,
            },
            downscaled: {
              data: downscaledBuffer,
            },
            file,
          } = r.value;

          const filename = getFilename(file);

          const upscaledBuffer = await this.upscale(model, downscaledBuffer, filename);
          const upscaledPath = path.resolve(upscaledFolder, filename);
          fs.writeFileSync(upscaledPath, upscaledBuffer);

          const diffPath = path.resolve(diffFolder, filename);

          const originalDimensions = await getSize(originalPath);
          const upscaledDimensions = await getSize(upscaledPath);
          if (originalDimensions.width !== upscaledDimensions.width || originalDimensions.height !== upscaledDimensions.height) {
            throw new Error(`Dimensions mismatch. Original image: ${JSON.stringify(originalDimensions)}, Upscaled image: ${JSON.stringify(upscaledDimensions)}`)
          }
          ssim.push(await this.calculatePerformance(upscaledPath, originalPath, diffPath, 'ssim'));
          psnr.push(await this.calculatePerformance(upscaledPath, originalPath, diffPath, 'psnr'));
          localN -= 1;
          r = await get.next();
        }
        results.set({
          modelDefinition,
          dataset,
        }, {
          psnr: avg(psnr),
          ssim: avg(ssim),
        });
      }
    }
    results.forEach((value, { modelDefinition, dataset }) => {
      console.log('Result for model', modelDefinition.packageInformation?.name, 'with scale', modelDefinition.scale, 'for dataset', dataset.folder)
      console.log(value);
    });
  }
}

/****
 * Main function
 */

type BenchmarkPerformance = (models: string[], datasets: string[], props?: { outputFile?: string, n?: number }) => Promise<void>;
const benchmarkPerformance: BenchmarkPerformance = async (models, datasets, { n = Infinity, outputFile } = {}) => new Promise(async (resolve, reject) => {
  const benchmarker = new Benchmarker(models, datasets, n);
  return 'foo';
});

export default benchmarkPerformance;

/****
 * Functions to expose the main function as a CLI tool
 */
interface Args {
  dataset: string;
  datasetName: string;
  outputFile?: string;
  n?: number;
}

const getArgs = async (): Promise<Args> => {
  const argv = await yargs.command('benchmark-performance <dataset> <output-file>', 'benchmark performance', yargs => {
    yargs.positional('dataset', {
      describe: 'The path to the dataset to run inference against',
    }).positional('datasetName', {
      describe: 'The name of the dataset',
    }).options({
      outputFile: { type: 'string' },
      n: { type: 'number' },
    });
  })
  .help()
  .argv;

  const dataset = await getString('What is the path to the dataset you wish to use?', argv._[0]);
  const datasetName = await getString('What is the name of the dataset you wish to use?', argv._[1]);

  return {
    dataset,
    datasetName,
    outputFile: typeof argv.outputFile === 'string' ? argv.outputFile : undefined,
    n: typeof argv.n === 'number' ? argv.n : undefined,
  }
}

if (require.main === module) {
  (async () => {
    await checkImagemagickInstallation()
    const { dataset, datasetName, outputFile, n } = await getArgs();
    await benchmarkPerformance(['esrgan-slim/dist/cjs/index.js'], [dataset], { outputFile, n });
  })();
}
