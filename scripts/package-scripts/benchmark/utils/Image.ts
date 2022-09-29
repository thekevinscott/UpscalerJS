import { DataTypes, Model } from "sequelize";
import sharp from "sharp";
import path from 'path';
import { File, } from './File';
import sequelize from './sequelize';
import { checkIntegers, getDims, getHashedFilepath, saveFile } from "./utils";
import { Result } from "./Result";
// import imageSize from 'image-size';
// import sharp from 'sharp';
// import util from 'util';
// import crypto from 'crypto';
// import { writeFileSync, mkdirpSync, readFileSync } from "fs-extra";
// import { Dataset } from "./Dataset";
// import { getHashedFilepath } from "./utils";

export class Image extends Model {
  declare id: number;
  declare srWidth: number;
  declare srHeight: number;
  declare srPath: string;
  declare lrWidth: number;
  declare lrHeight: number;
  declare lrPath: string;
  declare fileId: number;

  // static getHash(filePath: string) {
  //   return getHash(filePath);
  // }

  // static getSize(filePath: string) {
  //   return getSize(filePath);
  // }

  /**
   * 
   * Copy the image to a local cache directory, where it will be further manipulated
   */
  static makePath(filePath: string, ...parts: string[]) {
    return path.join(...parts, getHashedFilepath(filePath));
  }
  static getCropKey(cropSize?: number) {
    return cropSize ? `${cropSize}` : 'no-crop';
  }
  static getSrPath(filePath: string, cropSize?: number) {
    const cropKey = Image.getCropKey(cropSize);
    return Image.makePath(filePath, 'cropped', cropKey, 'sr');
  }
  static getLrPath(filePath: string, scale: number, cropSize?: number) {
    const cropKey = Image.getCropKey(cropSize);
    return Image.makePath(filePath, 'cropped', cropKey, `${scale}x`);
  }
  static async crop(cacheDir: string, file: File, cropWidth: number, cropHeight: number, scale: number, cropSize?: number) {
    const cropKey = Image.getCropKey(cropSize);
    const { width, height } = file;
    if (Math.round(cropWidth / 24) !== cropWidth / 24) {
      throw new Error(`Crop width is not divisible by 24: ${cropWidth}`);
    } 
    if (Math.round(cropHeight / 24) !== cropHeight / 24) {
      throw new Error(`Crop height is not divisible by 24: ${cropHeight}`);
    }
    try {
      const saveImage = (filePath: string, data: Buffer) => saveFile(path.resolve(cacheDir, filePath), data);
      checkIntegers('cropped original', cropWidth, cropHeight);
      const top = Math.floor((height / 2) - (cropHeight / 2));
      const left = Math.floor((width / 2) - (cropWidth / 2));
      const croppedImage = await sharp(path.resolve(cacheDir, file.cachedPath))
        .extract({
          width: cropWidth,
          height: cropHeight,
          top,
          left,
        })
        .toBuffer();
      const srPath = Image.getSrPath(file.path, cropSize);
      saveImage(srPath, croppedImage);

      const [lrWidth, lrHeight] = getDims(n => n / scale, cropWidth, cropHeight);
      checkIntegers('cropped downscaled', lrWidth, lrHeight);
      const downscaledCroppedImage = await sharp(croppedImage)
        .resize({ width: lrWidth, height: lrHeight })
        .toBuffer();
      const lrPath = Image.getLrPath(file.path, scale, cropSize);
      saveImage(lrPath, downscaledCroppedImage);
      return {
        cropKey,
        srPath, 
        lrPath,
        lrWidth,
        lrHeight,
      };
    } catch (err) {
      console.error('\n\n****Error processing crop');
      throw err;
    }
  }
}

Image.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  scale: {
    type: DataTypes.NUMBER,
    allowNull: false,
  },
  srWidth: {
    type: DataTypes.NUMBER,
    allowNull: false,
  },
  srHeight: {
    type: DataTypes.NUMBER,
    allowNull: false,
  },
  srPath: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lrWidth: {
    type: DataTypes.NUMBER,
    allowNull: false,
  },
  lrHeight: {
    type: DataTypes.NUMBER,
    allowNull: false,
  },
  lrPath: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  cropSize: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, { 
  sequelize, modelName: 'Image',
 });
