import { DataTypes, Model } from "sequelize";
import path from 'path';
import sequelize from './sequelize';
import { ROOT_DIR } from "./constants";
import { readFileSync } from "fs-extra";
import { UpscalerModel } from "./UpscalerModel";
import asyncPool from "tiny-async-pool";
import { ModelDefinition } from "upscaler";
import { ProgressBar } from "./utils";
const Upscaler = require('upscaler/node');

export class Package extends Model {
  declare id: number;
  declare name: string;
  upscalers = new Map<number, [typeof Upscaler, ModelDefinition]>();

  static getModels(packageName: string): [string, string][] {
    const modelPackageFolder = path.resolve(ROOT_DIR, 'models', packageName);
    const { name, exports } = JSON.parse(readFileSync(path.resolve(modelPackageFolder, 'package.json'), 'utf-8'));
    const keys = Object.keys(exports);
    if (keys.length === 1 && keys[0] === '.') {
      return [['.', name]]
    }
    // If we have a root level ./ definition, it means the model is bucket exporting all it's available
    // models. That means we can skip this entry.
    return Object.keys(exports).filter(key => key !== '.').map(key => [key, path.join(name, key)]);
  }

  async setId() {
    const pkg = await Package.findOne({
      where: {
        name: this.name,
      }
    });
    console.log(pkg);
    if (pkg === null) {
      throw new Error('No package was saved to the database');
    }
    const packageId = pkg.id;
    if (packageId === 0) {
      throw new Error('Package ID is 0')
    } else if (packageId > 10) {
      throw new Error(`Unexpected package ID: ${packageId}`)
    }
    this.id = pkg.id;
  }

  async addModels() {
    const packageName = this.name;
    const models = Package.getModels(packageName);
    const progressBar = new ProgressBar(models.length);
    await this.setId();

    const processFile = async ([key, modelName]: [key: string, modelName: string]) => {
      const [upscaler, modelDefinition] = await UpscalerModel.getUpscaler(packageName, modelName, key);
      const modelPath = path.join(packageName, modelName);
      try {
        await UpscalerModel.upsert({
          name: modelName,
          path: modelPath,
          scale: modelDefinition.scale,
          meta: modelDefinition.meta,
          PackageId: this.id,
        }, {
          logging: console.log,
        });
        const upscalerModel = await UpscalerModel.findOne({
          where: {
            path: modelPath,
          }
        });
        if (!upscalerModel) {
          throw new Error('Something wrong with model select')
        }
        this.upscalers.set(upscalerModel.id, [upscaler, modelDefinition]);
      } catch (err) {
        console.error('Failed to insert model for', {
          name: modelName,
          path: modelPath,
          scale: modelDefinition.scale,
          meta: modelDefinition.meta,
          PackageId: this.id,
        });
        throw err;
      }
    };
    for await (const value of asyncPool(5, models, processFile)) {
      progressBar.update();
    }
    progressBar.end();
  }

  get models() {
    return new Promise<UpscalerModel[]>(async resolve => {
      await this.setId();
      const PackageId = this.id;
      const models = await UpscalerModel.findAll({
        where: {
          PackageId,
        },
      });
      return resolve(models.map(model => {
        const cachedUpscalerValue = this.upscalers.get(model.id);
        if (!cachedUpscalerValue) {
          console.log(this.upscalers);
          throw new Error(`No Upscaler instantiated for model ${model.name} and id ${model.id}`)
        }
        const [upscaler, modelDefinition] = cachedUpscalerValue;
        model.upscaler = upscaler;
        model.modelDefinition = modelDefinition;
        return model;
      }));
    });
  }
}

Package.init({
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
}, {
  sequelize,
  modelName: 'Package'
});
