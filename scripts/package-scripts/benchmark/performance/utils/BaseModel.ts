import { BindOrReplacements, CreationAttributes,  Model, QueryTypes } from "sequelize";
import sequelize from './sequelize';

export class BaseModel extends Model {
  declare _id: number;

  static makeReturnUpsert<T extends BaseModel>(upsert: (options: CreationAttributes<T>) => Promise<[T, boolean | null]>, query: string, replacements: (options: CreationAttributes<T>) => BindOrReplacements, verbose?: boolean) {
    return async (options: CreationAttributes<T>) => {
      const [row] = await upsert(options);
      if (verbose) {
        console.log('row', row)
      }
      const fetchedIds = await sequelize.query<{ id: number }>(query, {
        replacements: replacements(options),
        type: QueryTypes.SELECT,
      });
      if (verbose) {
        console.log('fetched ids', fetchedIds)
      }
      if (fetchedIds.length === 0) {
        throw new Error(`No rows found for query ${query} with parameters ${replacements}`)
      }
      row.setId(fetchedIds[0].id);
      return row as T;
    }
  }

  setId(id: number) {
    this._id = id;
  }
  getId() {
    if (!this._id) {
      throw new Error('getId called before ID was set');
    }
    return this._id;
  }
}
