import { DataTypes, Model } from "sequelize";
import sequelize from './sequelize';

export class Result extends Model {
  declare id: number;
  declare value: number;
  declare metricId: number;
  declare imageId: number;
  declare modelId: number;
}

Result.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  // metricId: {
  //   type: DataTypes.INTEGER,
  //   allowNull: false,
  //   references: {
  //     model: 'Metrics',
  //     key: 'id',
  //   }
  // },
  // imageId: {
  //   type: DataTypes.INTEGER,
  //   allowNull: false,
  //   references: {
  //     model: 'Images',
  //     key: 'id',
  //   }
  // },
  // modelId: {
  //   type: DataTypes.INTEGER,
  //   allowNull: false,
  //   references: {
  //     model: 'UpscalerModels',
  //     key: 'id',
  //   }
  // },
}, {
  sequelize,
  modelName: 'Result'
});
