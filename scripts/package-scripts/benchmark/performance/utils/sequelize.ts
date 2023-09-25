import path from 'path';
import { Sequelize } from 'sequelize';
import { TMP_DIR } from '../../../utils/constants.mjs';

const DATABASE_FILE = path.resolve(TMP_DIR, 'cache.sql');
export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DATABASE_FILE,
  logging: false,
});

export default sequelize;
