import * as SQLite from "expo-sqlite";
import {
  createSqliteStorageAdapter,
  type SqliteStorageDriver,
  type StorageAdapter,
} from "../../../../src/core/storage";

const TABLE_NAME = "kv_storage";

async function initializeDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      storage_key TEXT PRIMARY KEY NOT NULL,
      storage_value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`
  );
}

export async function createExpoSqliteStorageDriver(
  databaseName = "linguisticnode.db"
): Promise<SqliteStorageDriver> {
  const db = await SQLite.openDatabaseAsync(databaseName);
  await initializeDatabase(db);

  return {
    async read(key: string): Promise<string | null> {
      const row = await db.getFirstAsync<{ storage_value: string }>(
        `SELECT storage_value FROM ${TABLE_NAME} WHERE storage_key = ?`,
        [key]
      );
      return row?.storage_value ?? null;
    },
    async write(key: string, value: string): Promise<void> {
      await db.runAsync(
        `INSERT INTO ${TABLE_NAME}(storage_key, storage_value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(storage_key)
         DO UPDATE SET storage_value = excluded.storage_value, updated_at = excluded.updated_at`,
        [key, value, new Date().toISOString()]
      );
    },
    async deleteByKey(key: string): Promise<void> {
      await db.runAsync(`DELETE FROM ${TABLE_NAME} WHERE storage_key = ?`, [key]);
    },
    async listKeys(): Promise<string[]> {
      const rows = await db.getAllAsync<{ storage_key: string }>(
        `SELECT storage_key FROM ${TABLE_NAME}`
      );
      return rows.map((row) => row.storage_key);
    },
  };
}

export async function createMobileSqliteStorageAdapter(): Promise<StorageAdapter> {
  const driver = await createExpoSqliteStorageDriver();
  return createSqliteStorageAdapter(driver);
}
