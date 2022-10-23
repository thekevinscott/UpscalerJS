import { CreationAttributes, DataTypes } from "sequelize";
import sequelize from './sequelize';
import { BaseModel } from "./BaseModel";
import { BrowserOption } from "../../../utils/browserStack";

export class Device extends BaseModel {
  declare id: number;
  declare os: string;
  declare os_version: string;
  declare browserName?: string;
  declare browser_version?: string;
  declare device?: string;
  declare real_mobile?: boolean;

  getCapabilities(): BrowserOption {
    return {
      os: this.os,
      os_version: this.os_version,
      browserName: this.browserName,
      browser_version: this.browser_version,
      device: this.device,
      real_mobile: this.real_mobile === true ? 'true' : undefined,
    }
  }

  static getCapabilitiesForQuery(options: CreationAttributes<Device>) {
    return Object.entries(options).reduce((obj, [key, val]) => {
      if (key === 'real_mobile') {
        return {
          ...obj,
          [key]: val === 'true',
        };
      }
      return {
        ...obj,
        [key]: val || null,
      };
    }, {} as CreationAttributes<Device>);
  }

}
Device.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  os: {
    type: DataTypes.STRING,
  },
  os_version: {
    type: DataTypes.STRING,
  },
  browserName: {
    type: DataTypes.STRING,
  },
  browser_version: {
    type: DataTypes.STRING,
  },
  device: {
    type: DataTypes.STRING,
  },
  real_mobile: {
    type: DataTypes.BOOLEAN,
  },
}, { 
  sequelize, 
  modelName: 'Device',
 });
