/**
 * Web SQLite driver backed by sql.js (WASM). In-memory only — refreshing the
 * tab clears state. Persistence is a TODO (IndexedDB sync).
 *
 * Exposes the subset of the expo-sqlite API surface that src/db/index.ts uses:
 *   - openDatabaseSync(name): SQLiteDatabase
 *   - SQLiteDatabase#execAsync(sql)
 *   - SQLiteDatabase#runAsync(sql, params?)
 *   - SQLiteDatabase#getFirstAsync<T>(sql, params?)
 *   - SQLiteDatabase#getAllAsync<T>(sql, params?)
 *   - SQLiteDatabase#withTransactionAsync(fn)
 *
 * Call ensureDbReady() once before the first openDatabaseSync().
 */
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';

let SQL: SqlJsStatic | null = null;
let _readyPromise: Promise<void> | null = null;

export function ensureDbReady(): Promise<void> {
  if (SQL) return Promise.resolve();
  if (_readyPromise) return _readyPromise;
  _readyPromise = (async () => {
    SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
    });
  })();
  return _readyPromise;
}

type Param = string | number | null | Uint8Array;

export class SQLiteDatabase {
  private readonly db: Database;
  constructor(db: Database) {
    this.db = db;
  }

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(sql: string, params: Param[] = []): Promise<void> {
    const stmt = this.db.prepare(sql);
    try {
      stmt.run(params as never);
    } finally {
      stmt.free();
    }
  }

  async getFirstAsync<T>(sql: string, params: Param[] = []): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params as never);
      return stmt.step() ? (stmt.getAsObject() as unknown as T) : null;
    } finally {
      stmt.free();
    }
  }

  async getAllAsync<T>(sql: string, params: Param[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    const out: T[] = [];
    try {
      stmt.bind(params as never);
      while (stmt.step()) out.push(stmt.getAsObject() as unknown as T);
    } finally {
      stmt.free();
    }
    return out;
  }

  async withTransactionAsync(fn: () => Promise<void>): Promise<void> {
    this.db.exec('BEGIN');
    try {
      await fn();
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
}

let _instance: SQLiteDatabase | null = null;

export function openDatabaseSync(_name: string): SQLiteDatabase {
  if (!SQL) {
    throw new Error(
      '[db/driver.web] sql.js not initialised. Call ensureDbReady() before openDatabaseSync().',
    );
  }
  if (!_instance) _instance = new SQLiteDatabase(new SQL.Database());
  return _instance;
}
