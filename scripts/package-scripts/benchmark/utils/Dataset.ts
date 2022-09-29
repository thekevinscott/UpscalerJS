import { DataTypes, Model } from "sequelize";
import path from 'path';
import { File, } from "./File";
import { Image, } from './Image';
import { getFiles, ProgressBar } from "./utils";
import sequelize from './sequelize';
import asyncPool from "tiny-async-pool";

const SCALES = [2,3,4,8];

export class Dataset extends Model {
  declare id: number;
  declare name: string;
  declare getFiles: () => Promise<File[]>;

  private _files?: File[];

  async setId() {
    const dataset = await Dataset.findOne({
      where: {
        name: this.name,
      }
    });
    if (dataset === null) {
      throw new Error('No dataset was written');
    }
    this.id = dataset.id;
  }

  get files() {
    return this.getFiles();
  }

  async prepareImages(cacheDir: string, cropSize?: number) {
    const files = await this.files;
    if (files.length === 0) {
      throw new Error(`There was an error fetching files for dataset ID ${this.id}, zero files were found.`);
    }

    const cropKey = Image.getCropKey(cropSize);
    const processCrop = async (file: File) => {
      const srWidth = cropSize || file.width;
      const srHeight = cropSize || file.height;
      for (const scale of SCALES) {
        const image = await Image.findOne({
          where: {
            FileId: file.id,
            scale,
            cropSize: cropKey,
          }
        });
        if (image === null) {
          const { cropKey, srPath, lrWidth, lrHeight, lrPath } = await Image.crop(cacheDir, file, srWidth, srHeight, scale, cropSize);
          await Image.upsert({
            cropSize: cropKey,
            srPath,
            lrPath,
            scale,
            srWidth,
            srHeight,
            lrWidth,
            lrHeight,
            FileId: file.id,
          });
        }
      }
    }
    if (files.length === 0) {
      throw new Error(`0 files found for dataset ${this.name}`);
    }
    console.log(`Preparing Crops: Dataset ${this.name}`);
    const progressBar = new ProgressBar(files.length);
    for await (const value of asyncPool(5, files, processCrop)) {
      progressBar.update();
    }
    progressBar.end();
  }

  async writeFiles (cacheDir: string, datasetPath: string) {
    const files = getFiles(datasetPath);
    await this.setId();
    const DatasetId = this.id;
    const presentFiles = (await this.files).reduce((obj, file) => ({
      ...obj,
      [file.path]: file,
    }), {} as Record<string, File>);
    const processFile = async (name: string) => {
      const filePath = path.resolve(datasetPath, name);
      const hash = File.getHash(filePath);
      const presentFile = presentFiles[filePath];
      if (!presentFile || hash !== presentFile.hash) {
        const { width, height } = await File.getSize(filePath);
        const { originalPath, croppedWidth, croppedHeight } = await File.cache(cacheDir, filePath, width, height);
        const [file] = await File.upsert({
          name,
          path: filePath,
          hash,
          width: croppedWidth,
          height: croppedHeight,
          DatasetId,
          cachedPath: originalPath,
        });
        return file;
      } else {
        return presentFile;
      }
    }
    console.log(`Dataset ${this.name}`);
    const progressBar = new ProgressBar(files.length);
    for await (const value of asyncPool(5, files, processFile)) {
      progressBar.update();
    }
    progressBar.end();
  }
}

Dataset.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  // TODO: Remove this, which requires recreating the database from scratch
  path: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, { sequelize, modelName: 'Dataset' });
