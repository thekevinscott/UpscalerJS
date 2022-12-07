import { useCallback, useState } from 'react';
import initSqlJs, { Database } from 'sql.js';

const getSQLjs = () => initSqlJs({
  locateFile: file => `/${file}`,
});

let _sql: Promise<initSqlJs.SqlJsStatic>;

export const loadDatabase = async (path: string) => {
  _sql = getSQLjs();
  const [SQL, buf] = await Promise.all([
    await _sql,
    fetch(path).then(res => res.arrayBuffer())
  ]);
  return new SQL.Database(new Uint8Array(buf));
}

export const useDatabase = (databasePath: string) => {
  const [db, setDb] = useState<Database>();

  const loadDb = useCallback(async () => {
    const _db = await loadDatabase(databasePath);
    setDb(_db);
    return _db;
  }, [databasePath]);

  const getDb = useCallback(() => {
    if (!db) {
      return loadDb();
    }

    return db;
  }, [databasePath]);

  const query = useCallback(async <T extends Record<string, string | number>> (stmt: string, opts?: Record<string, string | number>): Promise<T[]> => {
    const _db = await getDb();
    const results = _db.exec(stmt, opts);
    try {
      const [{ columns, values }] = results;
      return values.reduce((arr, rowOfValues) => {
        const row = rowOfValues.reduce((obj, value, i) => ({
          ...obj,
          [columns[i]]: value,
        }), {} as T);
        return arr.concat(row);
      }, [] as T[]);
    } catch (err) {
      console.error(stmt, opts);
      console.error(results);
      throw err;
    }
  }, [getDb]);

  return {
    query,
  };
}

export function arrayQuery <T>(items?: T[]) {
  if (items) {
    return `(${items.map(() => '?').join(',')})`;
  }
  return '';
}
