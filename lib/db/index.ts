import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './migrations';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  dbPromise ??= (async () => {
    const db = await SQLite.openDatabaseAsync('prometeu.db');
    await db.execAsync('PRAGMA journal_mode = WAL;');
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    for (let v = row?.user_version ?? 0; v < MIGRATIONS.length; v++) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(MIGRATIONS[v]);
        await db.execAsync(`PRAGMA user_version = ${v + 1}`);
      });
    }
    return db;
  })();
  return dbPromise;
}
