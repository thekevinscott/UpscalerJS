import { DataTypes, Model, Sequelize } from "sequelize";
import { Dataset } from "./Dataset";
import { DatasetDefinition } from "./types";
import sequelize from './sequelize';
import { UpscalerModel } from "./UpscalerModel";
import { Package } from "./Package";
import asyncPool from "tiny-async-pool";
import { Metric } from "./Metric";
import { File } from "./File";
import { Image } from "./Image";
import { Result } from "./Result";

export class Database {
  ready: Promise<void>;
  constructor() {
    this.ready = this.initialize();
  }

  async initialize() {
    await sequelize.sync();
    await Promise.all(['psnr', 'ssim'].map(name =>
      Metric.upsert({
        name,
      })
    ));
  }

  async addDataset(cacheDir: string, { datasetName, datasetPath }: DatasetDefinition, writeFiles = true) {
    await this.ready;
    const [dataset] = await Dataset.upsert({
      name: datasetName,
      path: datasetPath,
    });
    if (writeFiles) {
      await dataset.writeFiles(cacheDir);
    }
    return dataset;
  }

  async addModelPackage(packageName: string, resultsOnly?: boolean) {
    await this.ready;
    const [modelPackage] = await Package.upsert({
      name: packageName,
    });

    if (resultsOnly !== true) {
      await modelPackage.addModels();
    }

    return modelPackage;
  }
}


Dataset.hasMany(File);
File.belongsTo(Dataset);
File.hasMany(Image);
Image.belongsTo(File);
Image.hasMany(Result);
Metric.hasMany(Result);
UpscalerModel.belongsTo(Package);
UpscalerModel.hasMany(Result);
Package.hasMany(UpscalerModel);
Result.belongsTo(UpscalerModel);
Result.belongsTo(Metric);
Result.belongsTo(Image);
// Result.belongsTo(File, { })
