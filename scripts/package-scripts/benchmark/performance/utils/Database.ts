import { Dataset } from "./Dataset";
import { DatasetDefinition } from "./types";
import sequelize from './sequelize';
import { UpscalerModel } from "./UpscalerModel";
import { Package } from "./Package";
import { Metric } from "./Metric";
import { File } from "./File";
import { Image } from "./Image";
import { Device } from './Device';
import { PerformanceMeasurement } from "./PerformanceMeasurement";
import { CreationAttributes } from "sequelize";
import { SpeedMeasurement } from "./SpeedMeasurement";

type CB = (seq: typeof sequelize) => Promise<void>;
export class Database {
  async initialize(cb?: CB) {
    await sequelize.sync();
    if (cb) {
      await cb(sequelize);
    }
  }

  async addDataset(cacheDir: string, { datasetName, datasetPath }: DatasetDefinition, writeFiles = true, cropSize?: number, n = Infinity) {
    const [dataset] = await Dataset.upsert({
      name: datasetName,
    });
    if (writeFiles) {
      await dataset.writeFiles(cacheDir, datasetPath, cropSize, n);
    }
    return dataset;
  }

  async addModelPackage(packageName: string, experimental: boolean, models?: string[], resultsOnly?: boolean, useGPU = false, callback?: (modelPackage: Package) => void) {
    const modelPackage = await Package.returnUpsert({
      name: packageName,
      experimental,
    });

    modelPackage.useGPU = useGPU;

    if (callback) {
      callback(modelPackage);
    }

    if (resultsOnly !== true) {
      await modelPackage.addModels(models);
    }

    return modelPackage;
  }

  async addDevice(options: CreationAttributes<Device>) {
    const whereOptions = Device.getCapabilitiesForQuery(options);
    let device = await Device.findOne({
      where: whereOptions,
    });
    if (!device) {
      device = await Device.create(options);
    }
    return device;
  }
}


Dataset.hasMany(File);
File.belongsTo(Dataset);
File.hasMany(Image);
Image.belongsTo(File);
Image.hasMany(PerformanceMeasurement);
Metric.hasMany(PerformanceMeasurement);
UpscalerModel.belongsTo(Package);
UpscalerModel.hasMany(PerformanceMeasurement);
Package.hasMany(UpscalerModel);
PerformanceMeasurement.belongsTo(UpscalerModel);
PerformanceMeasurement.belongsTo(Metric);
PerformanceMeasurement.belongsTo(Image);
UpscalerModel.hasMany(SpeedMeasurement);
SpeedMeasurement.belongsTo(Device);
SpeedMeasurement.belongsTo(UpscalerModel);
