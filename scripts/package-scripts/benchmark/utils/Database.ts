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

    await this.createView();
  }

  async createView() {
    await sequelize.query(`DROP VIEW IF EXISTS aggregated_results`);
    await sequelize.query(`
        CREATE VIEW aggregated_results
        AS
        SELECT 

        AVG(r.value) as value, 
        d.id as DatasetId, 
        r.MetricId, 
        r.UpscalerModelId, 
        i.cropSize

        FROM Results r

        LEFT JOIN Metrics m ON m.id = r.MetricId

        LEFT JOIN UpscalerModels um ON um.id = r.UpscalerModelId
        LEFT JOIN Packages p ON p.id = um.PackageId

        LEFT JOIN Images i ON i.id = r.ImageId
        LEFT JOIN Files f ON f.id = i.FileId
        LEFT JOIN Datasets d ON d.id = f.DatasetId

        WHERE 1=1

        GROUP BY 
        m.name, 
        d.name,
        um.name,
        i.cropSize
      `);
  }

  async addDataset(cacheDir: string, { datasetName, datasetPath }: DatasetDefinition, writeFiles = true, cropSize?: number) {
    await this.ready;
    const [dataset] = await Dataset.upsert({
      name: datasetName,
    });
    if (writeFiles) {
      await dataset.writeFiles(cacheDir, datasetPath, cropSize);
    }
    return dataset;
  }

  async addModelPackage(packageName: string, resultsOnly?: boolean) {
    await this.ready;
    const modelPackage = await Package.returnUpsert({
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

