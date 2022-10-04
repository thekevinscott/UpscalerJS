import { DataTypes, Model, QueryTypes } from "sequelize";
import path from 'path';
import { File, } from "./File";
import { Image, } from './Image';
import { getFiles } from "./utils";
import sequelize from './sequelize';
import asyncPool from "tiny-async-pool";
import { SCALES } from "./constants";
import { ProgressBar } from "../../../utils/ProgressBar";

interface ExistingFileRow {
  fileName: string;
  scale: number;
  fileId: number;
  width: number;
  height: number;
  imageId: number;
  cachedPath: string;
}

type PartialFile = Omit<ExistingFileRow, 'scale' | 'imageId'>;

const getImagePresentInDatabaseKey = ({ fileName }: Pick<PartialFile, 'fileName'>, scale: number): string => [fileName, scale].join('-');

export class Dataset extends Model {
  declare id: number;
  declare name: string;
  declare getFiles: () => Promise<File[]>;
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

  async processCrop(cacheDir: string, scale: number, { id: FileId, width, height, cachedPath, filePath }: {
    id: number;
    width: number;
    height: number;
    cachedPath: string;
    filePath: string;
  }, cropSize?: number) {
    const cropKey = Image.getCropKey(cropSize);
    const srWidth = cropSize || width;
    const srHeight = cropSize || height;
    try {
      const { srPath, lrWidth, lrHeight, lrPath } = await Image.crop(cacheDir, {
        width,
        height,
        cachedPath,
        filePath,
      }, srWidth, srHeight, scale, cropSize);
      await Image.upsert({
        cropSize: cropKey,
        srPath,
        lrPath,
        scale,
        srWidth,
        srHeight,
        lrWidth,
        lrHeight,
        FileId,
      }, {
        fields: [ ],
      });
    } catch (err) {
      console.error('\n Error upserting image', scale, filePath, cropKey);
      throw err;
    }
  }

  async getExistingFiles(cropKey: string) {
    const existingFilesAndImages = await sequelize.query<ExistingFileRow>(`
      SELECT 
      f.name as fileName,
      f.id as fileId,
      f.width,
      f.height,
      f.cachedPath,

      i.cropSize as cropKey,
      f.DatasetId,
      i.id as imageId,
      i.scale as scale

      FROM images i
      LEFT JOIN files f ON f.id = i.FileId
      WHERE 1=1
      AND f.DatasetId = :DatasetId
      AND i.cropSize = "${cropKey}"

      ORDER BY fileName ASC, scale ASC
    `, {
      replacements: {
        cropKey,
        DatasetId: this.id,
      },
      type: QueryTypes.SELECT,
    });
    const filesPresentInDatabase = new Map<string, PartialFile>();
    const imagesPresentInDatabase = new Set<string>();
    for (const row of existingFilesAndImages) {
      const { scale, ...file } = row;
      filesPresentInDatabase.set(row.fileName, file);
      imagesPresentInDatabase.add(getImagePresentInDatabaseKey(file, scale));
    }

    return {
      filesPresentInDatabase,
      imagesPresentInDatabase,
    }
  }

  async writeFiles (cacheDir: string, datasetPath: string, cropSize?: number, n = Infinity) {
    await this.setId();
    const cropKey = Image.getCropKey(cropSize);
    const { filesPresentInDatabase, imagesPresentInDatabase } = await this.getExistingFiles(cropKey);
    const DatasetId = this.id;
    const localFilesOnDisk = getFiles(datasetPath);
    const getOrCreateFile = async (name: string): Promise<PartialFile> => {
      let file = filesPresentInDatabase.get(name);
      if (!file?.fileId) {
        const filePath = path.resolve(datasetPath, name);
        const hash = File.getHash(filePath);
        const { width, height } = await File.getSize(filePath);
        const { originalPath, croppedWidth, croppedHeight } = await File.cache(cacheDir, filePath, width, height);
        const row = await File.returnUpsert({
          name,
          hash,
          width: croppedWidth,
          height: croppedHeight,
          DatasetId,
          cachedPath: originalPath,
        });
        return {
          fileName: row.name,
          fileId: row.getId(),
          width: row.width,
          height: row.height,
          cachedPath: row.cachedPath,
        }
      }
      return file;
    };

    const getOrCreateImage = async (datasetPath: string, file: PartialFile) => {
      for (const scale of SCALES) {
        const imageKey = getImagePresentInDatabaseKey(file, scale);
        if (!imagesPresentInDatabase.has(imageKey)) {
          const filePath = path.resolve(datasetPath, file.fileName);
          await this.processCrop(cacheDir, scale, {
            id: file.fileId,
            width: file.width,
            height: file.height,
            cachedPath: file.cachedPath,
            filePath,
          }, cropSize);
        }
      }
    }
    const processFile = async (i: number) => {
      const name = localFilesOnDisk[i];
      const file = await getOrCreateFile(name);
      await getOrCreateImage(datasetPath, file);
    }

    console.log(`Dataset ${this.name}`);
    const total = Math.min(n, localFilesOnDisk.length);
    const progressBar = new ProgressBar(total);
    for await (const value of asyncPool(15, Array(total).fill('').map((_, i) => i), processFile)) {
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
}, { sequelize, modelName: 'Dataset' });
