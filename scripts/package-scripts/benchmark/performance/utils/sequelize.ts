import path from 'path';
import { Sequelize } from 'sequelize';

const ROOT_DIR = path.resolve(__dirname, '../../../../..');
const DATABASE_FILE = path.resolve(ROOT_DIR, 'tmp/performance.sql');
export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DATABASE_FILE,
  logging: false,
});

export default sequelize;
