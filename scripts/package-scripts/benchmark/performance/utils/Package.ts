import { DataTypes, Model, QueryTypes } from "sequelize";
import path from 'path';
import sequelize from './sequelize';
import { readFileSync } from "fs-extra";
import { UpscalerModel } from "./UpscalerModel";
import asyncPool from "tiny-async-pool";
import { ModelDefinition } from "upscaler";
import { BaseModel } from "./BaseModel";
import { ProgressBar } from "../../../utils/ProgressBar";
import { TF } from "./types";
import { MODELS_DIR } from "../../../utils/constants";
const Upscaler = require('upscaler/node');

const packageJSONs = new Map<string, Record<string, any>>();

export class Package extends BaseModel {
  declare _id: number;
  declare name: string;
  upscalers = new Map<string, [typeof Upscaler, ModelDefinition]>();
  useGPU = false
  tf?: TF;

  getPackageName() {
    return Package.getPackageJSON(this.name).name;
  }

  static getPackageJSON(packageName: string) {
    const packageJSON = packageJSONs.get(packageName);
    if (!packageJSON) {
      const modelPackageFolder = path.resolve(MODELS_DIR, packageName);
      const packageJSON = JSON.parse(readFileSync(path.resolve(modelPackageFolder, 'package.json'), 'utf-8'));
      packageJSONs.set(packageName, packageJSON);
      return packageJSON;
    }
    return packageJSON;
  }

  static getExportedModelsFromPackageJSON(packageName: string): string[] {
    const { exports } = Package.getPackageJSON(packageName);
    const keys = Object.keys(exports);
    if (keys.length === 1 && keys[0] === '.') {
      return keys;
    }
    // If we have a root level ./ definition, it means the model is bucket exporting all it's available
    // models. That means we can skip this entry.
    // return Object.keys(exports).filter(key => key !== '.').map(key => [key, path.join(name, key)]);
    return Object.keys(exports).filter(key => key !== '.');
  }

  static returnUpsert = BaseModel.makeReturnUpsert<Package>(({ name }) => Package.upsert({
    name,
  }), `
      SELECT id FROM packages WHERE name = :name
  `, ({ name }) => ({
    name,
  }));

  async clearOutDuplicates() {
    const PackageId = this.getId();
    const rows = await sequelize.query<{ id: number; name: string }>(`
      SELECT 
      u.id, u.name
      FROM upscalerModels u
      LEFT JOIN packages p ON p.id = u.PackageId
      WHERE 1=1
      AND p.id = :PackageId
      ;
    `, {
      replacements: {
        PackageId,
      },
      type: QueryTypes.SELECT,
    });
    const seenNames = new Set();
    for (const row of rows) {
      if (seenNames.has(row.name)) {
        await sequelize.query(`
          DELETE FROM upscalerModels
          WHERE id = :ModelId
          ;
        `, {
          replacements: {
            ModelId: row.id,
          },
        });
      }
      seenNames.add(row.name);
    }
  }

  async getUpscalerModels(): Promise<UpscalerModel[]> {
    await this.clearOutDuplicates();
    const names = this.getModelKeysAndPaths();
    const PackageId = this.getId();
    const results = await UpscalerModel.findAll({
      where: {
        PackageId,
        name: names,
      }
    });
    const modelNames = new Set();
    for (const result of results) {
      if (modelNames.has(result.name)) {
        throw new Error(`Duplicate entry exists for name ${result.name} for package ${this.name}`)
      }
      modelNames.add(result.name);
    }
    return results;
  }

  async getUpscaler(modelName: string): Promise<[typeof Upscaler, ModelDefinition]> {
    const useGPU = this.useGPU;
    const modelPath = UpscalerModel.buildModelPath(this.name, modelName);
    const upscaler = this.upscalers.get(modelPath);
    if (!upscaler) {
      if (!this.tf) {
        throw new Error('No tensorflow defined');
      }
      const _upscaler = await UpscalerModel.getUpscaler(this.tf, this.name, modelName, useGPU);
      this.upscalers.set(modelPath, _upscaler);
      return _upscaler;
    }
    return upscaler;
  }

  getModelKeysAndPaths() {
    const models = this._models;
    const packageName = this.name;
    return Package.getExportedModelsFromPackageJSON(packageName).filter((name) => {
      if (models === undefined) {
        return true;
      }

      return models.reduce((shouldInclude, model) => {
        if (shouldInclude) {
          return true;
        }

        return name.toLowerCase().includes(model.toLowerCase());
      }, false);
    });

  }

  private _models?: string[];
  async addModels(models?: string[]) {
    this._models = models;
    const modelKeysAndPaths = this.getModelKeysAndPaths().filter(model => {
      if (models) {
        return models.reduce((isMatch, modelPart) => {
          return isMatch || model.toLowerCase().includes(modelPart.toLowerCase());
        }, false);
      }
      return true;
    });
    const existingUpscalerModelNames = new Set<any>((await this.getUpscalerModels()).map(model => model.name));
    const progressBar = new ProgressBar(modelKeysAndPaths.length);

    const processFile = async (modelName: string) => {
      if (!existingUpscalerModelNames.has(modelName)) {
        const PackageId = this.getId();
        const [_, modelDefinition] = await this.getUpscaler(modelName);
        try {
          await UpscalerModel.upsert({
            name: modelName,
            scale: modelDefinition.scale,
            meta: modelDefinition.meta,
            PackageId,
          });
        } catch (err) {
          console.error('Failed to insert model for', {
            name: modelName,
            scale: modelDefinition.scale,
            meta: modelDefinition.meta,
            PackageId
          });
          throw err;
        }
      }
    };
    for await (const _ of asyncPool(1, [...modelKeysAndPaths], processFile)) {
      progressBar.update();
    }
    progressBar.end();
  }

  get models() {
    throw new Error();
  }

  async getModels(modelNames?: string[]): Promise<UpscalerModel[]> {
    const models = await this.getUpscalerModels();
    const filteredModels = models.filter(model => {
      if (modelNames === undefined) {
        return true;
      }

      return modelNames.reduce((shouldInclude, modelName) => {
        if (shouldInclude) {
          return true;
        }

        return model.name.toLowerCase().includes(modelName.toLowerCase());
      }, false);
    });
    await Promise.all(filteredModels.map(async model => {
      try {
        const [upscaler, modelDefinition] = await this.getUpscaler(model.name);
        model.upscaler = upscaler;
        model.modelDefinition = modelDefinition;
        return model;
      } catch (err) {
        return undefined;
      }
    }).filter(model => model));
    return filteredModels;
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
