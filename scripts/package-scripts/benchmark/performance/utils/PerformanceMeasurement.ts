import { DataTypes, Model } from "sequelize";
import sequelize from './sequelize';

export class PerformanceMeasurement extends Model {
  declare id: number;
  declare value: number;
  declare metricId: number;
  declare imageId: number;
  declare modelId: number;
}

PerformanceMeasurement.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'PerformanceMeasurement',
});
