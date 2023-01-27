import { DataTypes, Model } from "sequelize";
import path from 'path';
import sequelize from './sequelize';
import { readFileSync } from "fs-extra";
import { Meta, ModelDefinition } from "@upscalerjs/core";
import { Package } from "./Package";
import _Upscaler from 'upscaler';
import { TF } from "./types";
import { MODELS_DIR } from "../../../utils/constants";

export class UpscalerModel extends Model {
  declare id: number;
  // a name is the key defined in the exports object in package.json. It is _not_ the name of the package
  declare name: string;
  declare scale: number;
  declare meta: any;
  declare packageId?: number;

  _upscaler?: _Upscaler;
  _modelDefinition?: ModelDefinition;
  _package?: Package;

  get modelDefinition() {
    if (!this._modelDefinition) {
      throw new Error(`No model definition set for model ${this.name}, meta: ${JSON.stringify(this.meta)}`);
    }

    return this._modelDefinition;
  }

  get upscaler(): _Upscaler {
    if (!this._upscaler) {
      throw new Error(`No upscaler set for model for name ${this.name}, meta: ${JSON.stringify(this.meta)}`);
    }

    return this._upscaler;
  }

  set upscaler(upscaler: _Upscaler) {
    this._upscaler = upscaler;
  }
  set modelDefinition(modelDefinition: ModelDefinition) {
    this._modelDefinition = modelDefinition;
  }

  async hydrate(tf: TF) {
    try {
      this._package;
    } catch(err) {
      if (!this.packageId) {
        throw new Error('No package id');
      }
      const pkg = await Package.findByPk(this.packageId);
      if (pkg === null) {
        throw new Error(`No package found for package id ${this.packageId}`);
      }
      this._package = pkg;
    }

    try {
      this.upscaler;
      this.modelDefinition
    } catch(err) {
      const pkg = await this.package;
      const [upscaler, modelDefinition] = await UpscalerModel.getUpscaler(tf, pkg.name, this.name);
      this.upscaler = upscaler;
      this.modelDefinition = modelDefinition;
    }
    const pkg = await this.package;
    // console.log(`** Hydrated model ${this.name} in package ${pkg.name}`);
  }

  get package() {
    return new Promise<Package>(async (resolve) => {
      if (!this._package) {
        const packageId = this.packageId;
        if (!packageId) {
          throw new Error(`No package id set for model for name ${this.name}`);
        }
        const pkg = await Package.findOne({
          where: {
            id: packageId,
          },
        });
        if (pkg === null) {
          throw new Error(`No package found for ${packageId}`);
        }
        this._package = pkg;
      }
      return resolve(this._package);
    });
  }

  static async getUpscaler(tf: TF, modelPackageName: string, modelName: string, useGPU = false): Promise<[_Upscaler, ModelDefinition]> {
    if (!modelPackageName) {
      throw new Error('Model package name must be provided')
    }
    if (!modelName) {
      throw new Error('Model name must be provided')
    }
    const modelPackageFolder = path.resolve(MODELS_DIR, modelPackageName);
    const upscaler = await getUpscalerFromExports(tf, modelPackageFolder, modelName, useGPU);
    if (!upscaler) {
      throw new Error();
    }
    const { modelDefinition } = await upscaler.getModel();
    return [upscaler, modelDefinition];
  }

  static buildModelPath(modelPackageName: string, modelName: string) {
    return path.join(modelPackageName, modelName);
  }
}


UpscalerModel.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  scale: {
    type: DataTypes.NUMBER,
    allowNull: false,
  },
  meta: {
    type: DataTypes.JSON,
  },
}, {
  indexes: [
    {
      unique: true,
      fields: ['name', 'PackageId']
    }
  ],
  sequelize,
  modelName: 'UpscalerModel',
  
});

// only import it once
let LocalUpscaler: typeof _Upscaler;
const getGlobalUpscaler = (useGPU?: boolean): typeof _Upscaler => {
  if (!LocalUpscaler) {
    LocalUpscaler = useGPU ? require('upscaler/node-gpu') : require('upscaler/node');
  }
  return LocalUpscaler;
}

export const getUpscalerFromExports = async (tf: TF, modelPackageFolder: string, key: string, useGPU = false) => {
  const { exports } = JSON.parse(readFileSync(path.resolve(modelPackageFolder, 'package.json'), 'utf-8'));
  const Upscaler = getGlobalUpscaler(useGPU);
  const value = exports[key];
  if (typeof value === 'object') {
    const { require: importPath, } = value;
    const pathToModel = getPathToModel(modelPackageFolder, importPath, value);
    const modelDefinitionFn = (await import(pathToModel)).default;
    const { packageInformation, ...modelDefinition } = modelDefinitionFn(tf) as ModelDefinition;

    const modelPath = path.resolve(modelPackageFolder, modelDefinition.path);
    const model = {
      ...modelDefinition,
      // provide the explicit path to avoid going through the package discovery process (which
      // won't work because of pnpm's local linking)
      path: tf.io.fileSystem(modelPath) as any as string,
    }
    try {
      const upscaler = new Upscaler({
        model,
      });
      await upscaler.getModel();
      return upscaler;
    } catch (err: unknown) {
      throw new Error([
      `Error instantiating upscaler:`,
      JSON.stringify(Object.entries(model).reduce((obj, [key, val]) => ({
        ...obj,
        [key]: val || 'undefined',
      }), {} as any), null, 2),
      err instanceof Error ? err.message : JSON.stringify(err),
      ].join('\n\n'));
    }
  }
};

const getPathToModel = (modelPackageFolder?: string, importPath?: string, value?: unknown) => {
  if (modelPackageFolder === undefined) {
    throw new Error('modelPackageFolder is undefined');
  }
  if (importPath === undefined) {
    console.log('value', value);
    throw new Error('importPath is undefined');
  }
  if (typeof importPath !== 'string') {
    throw new Error(`importPath is not a string: ${JSON.stringify(importPath)}`)
  }
  try {
    return path.resolve(modelPackageFolder, importPath);
  } catch (err) {
    console.error(modelPackageFolder, importPath);
    throw err;
  }
}
