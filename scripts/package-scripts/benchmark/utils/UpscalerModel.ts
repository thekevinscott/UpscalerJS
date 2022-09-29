import { DataTypes, Model } from "sequelize";
import * as tf from '@tensorflow/tfjs-node';
import path from 'path';
import sequelize from './sequelize';
import { ROOT_DIR } from "./constants";
import { readFileSync } from "fs-extra";
import { ModelDefinition } from "@upscalerjs/core";
import { Package } from "./Package";
import { Result } from "./Result";

const Upscaler = require('upscaler/node');

export class UpscalerModel extends Model {
  declare id: number;
  declare path: string;
  declare name: string;
  declare scale: number;
  declare meta: Record<string, any>;
  declare packageId: number;

  _upscaler?: typeof Upscaler;
  _modelDefinition?: ModelDefinition;
  _package?: Package;

  get modelDefinition() {
    if (!this._modelDefinition) {
      throw new Error(`No model definition set for model ${this.name}, ${JSON.stringify(this.meta)}`);
    }

    return this._modelDefinition;
  }

  get upscaler() {
    if (!this._upscaler) {
      throw new Error(`No upscaler set for model ${this.name}, ${JSON.stringify(this.meta)}`);
    }

    return this._upscaler;
  }

  set upscaler(upscaler: typeof Upscaler) {
    this._upscaler = upscaler;
  }
  set modelDefinition(modelDefinition: ModelDefinition) {
    this._modelDefinition = modelDefinition;
  }

  get package() {
    return new Promise<Package>(async (resolve) => {
      if (!this._package) {
        const packageId = this.packageId;
        const pkg = await Package.findOne({
          where: {
            packageId,
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

  static async getUpscaler(modelPackageName: string, modelName: string, key: string) {
    if (!modelPackageName) {
      throw new Error('Model package name must be provided')
    }
    if (!modelName) {
      throw new Error('Model name must be provided')
    }
    if (!key) {
      throw new Error('Model key must be provided')
    }
    const modelPackageFolder = path.resolve(ROOT_DIR, 'models', modelPackageName);
    const { exports } = JSON.parse(readFileSync(path.resolve(modelPackageFolder, 'package.json'), 'utf-8'));
    const upscaler = await getUpscalerFromExports(modelPackageFolder, modelName, exports, key);
    const { modelDefinition } = await upscaler.getModel();
    if (modelName !== modelDefinition.meta.modelName) {
      throw new Error(`Mismatch, model name ${modelName} does not match package name ${modelDefinition.meta.modelName}`);
    }
    return [upscaler, modelDefinition];
  }
}

UpscalerModel.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
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
  // packageId: {
  //   type: DataTypes.INTEGER,
  //   allowNull: false,
  //   references: {
  //     model: 'Packages',
  //     key: 'id',
  //   }
  // },
}, {
  sequelize,
  modelName: 'UpscalerModel'
});

// // We save the return values of the association setup calls to use them later
// Product.User = Product.belongsTo(User);
// User.Addresses = User.hasMany(Address);

const getUpscalerFromExports = async (modelPackageFolder: string, modelName: string, exports: Record<string, any>, key: string) => {
  const value = exports[key];
  if (typeof value === 'object') {
    const { require: importPath, } = value;
    const pathToModel = getPathToModel(modelPackageFolder, importPath, value);
    const modelDefinitionFn = (await import(pathToModel)).default;
    const { packageInformation, ...modelDefinition } = modelDefinitionFn(tf) as ModelDefinition;
    const model = {
      // provide the explicit path to avoid going through the package discovery process (which
      // won't work because of pnpm's local linking)
      ...modelDefinition,
      path: tf.io.fileSystem(path.resolve(modelPackageFolder, modelDefinition.path)),
      meta: {
        modelName,
        modelPackageFolder,
      }
    }
    try {
      const upscaler = new Upscaler({
        model,
      });
      await upscaler.getModel();
      return upscaler;
    } catch (err) {
      console.error('Error instantiating upscaler for model definition', model);
      throw err;
    }
  } else {
    console.error(value);
    throw new Error('Handle this')
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
  try {
    return path.resolve(modelPackageFolder, importPath);
  } catch (err) {
    console.log(modelPackageFolder, importPath);
    throw err;
  }
}
