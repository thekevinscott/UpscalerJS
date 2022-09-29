import { DataTypes, Model } from "sequelize";
import path from 'path';
import sequelize from './sequelize';
import sharp from 'sharp';
import { checkIntegers, getDims, getHash, getHashedFilepath, getSize, saveFile } from "./utils";
import { Image } from "./Image";

export class File extends Model {
  declare id: number;
  declare name: string;
  declare path: string;
  declare hash: string;
  declare width: number;
  declare height: number;
  declare datasetId: number;
  declare cachedPath: string;

  static getHash(filePath: string) {
    return getHash(filePath);
  }

  static getSize(filePath: string) {
    return getSize(filePath);
  }

  async setId() {
    const file = await File.findOne({
      where: {
        cachedPath: this.cachedPath,
      }
    });
    if (file === null) {
      throw new Error(`No file was found for ${this.cachedPath}`);
    }
    this.id = file.id;
  }

  async getImage(cacheDir: string, scale: number, cropSize?: number) {
    await this.setId();
    // const imageId = this.id;
    const lrPath = Image.getLrPath(this.path, scale, cropSize);
    const image = await Image.findOne({
      where: {
        lrPath,
      }
    });

    if (image === null) {
      throw new Error(`No image found with lr page ${lrPath} in the database, should have been written`);
    }

    return image;
  }

  /**
   * 
   * Copy the image to a local cache directory, where it will be further manipulated
   */
  static async cache(cacheDir: string, filePath: string, width: number, height: number) {
    const scale = 3 * 8; // we only support 2, 3, 4, and 8x scales; resize the image to a number that is divisible by all.
    const [originalWidth, originalHeight] = getDims(n => Math.floor(n / scale) * scale, width, height);
    checkIntegers('original', originalWidth, originalHeight);
    const originalImage = await sharp(filePath)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize({ width: originalWidth, height: originalHeight, fit: 'cover' })
      .toBuffer();
    const originalPath = path.join('original', getHashedFilepath(filePath));
    saveFile(path.resolve(cacheDir, originalPath), originalImage);
    return { originalPath, croppedHeight: originalHeight, croppedWidth: originalWidth } ;
  }
}

File.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  width: {
    type: DataTypes.NUMBER,
    allowNull: false,
  },
  height: {
    type: DataTypes.NUMBER,
    allowNull: false,
  },
  cachedPath: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, { sequelize, modelName: 'File' });
