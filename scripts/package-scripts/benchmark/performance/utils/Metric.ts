import { DataTypes, Model } from "sequelize";
import { Result } from "./Result";
import sequelize from './sequelize';

export class Metric extends Model {
  declare id: number;
  declare name: string;

  async setId() {
    const metric = await Metric.findOne({
      where: {
        name: this.name,
      }
    });
    if (metric === null) {
      throw new Error('No metric was written');
    }
    this.id = metric.id;
  }
}

Metric.init({
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
  modelName: 'Metric'
});
