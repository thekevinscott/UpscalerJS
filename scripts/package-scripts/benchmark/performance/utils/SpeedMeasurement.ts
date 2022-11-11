import { DataTypes, Model } from "sequelize";
import sequelize from './sequelize';

export class SpeedMeasurement extends Model {
  declare id: number;
  declare value: number;
  declare size: number;
  declare DeviceId: number;
  declare UpscalerModelId: number;
}

SpeedMeasurement.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'SpeedMeasurement'
});
