import { Dataset } from "./Dataset";
import { DatasetDefinition, TF } from "./types";
import sequelize from './sequelize';
import { UpscalerModel } from "./UpscalerModel";
import { Package } from "./Package";
import { Metric } from "./Metric";
import { File } from "./File";
import { Image } from "./Image";
import { Result } from "./Result";

type CB = (seq: typeof sequelize) => Promise<void>;
export class Database {
  ready: Promise<void>;
  constructor(cb?: CB) {
    this.ready = this.initialize(cb);
  }

  async initialize(cb?: CB) {
    await sequelize.sync();
    if (cb) {
      await cb(sequelize);
    }
  }

  async addDataset(cacheDir: string, { datasetName, datasetPath }: DatasetDefinition, writeFiles = true, cropSize?: number, n = Infinity) {
    await this.ready;
    const [dataset] = await Dataset.upsert({
      name: datasetName,
    });
    if (writeFiles) {
      await dataset.writeFiles(cacheDir, datasetPath, cropSize, n);
    }
    return dataset;
  }

  async addModelPackage(tf: TF, packageName: string, resultsOnly?: boolean, useGPU = false, models?: string[]) {
    await this.ready;
    const modelPackage = await Package.returnUpsert({
      name: packageName,
    });

    modelPackage.useGPU = useGPU;
    modelPackage.tf = tf;

    if (resultsOnly !== true) {
      await modelPackage.addModels(models);
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

