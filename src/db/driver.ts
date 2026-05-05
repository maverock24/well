/**
 * Native driver: re-export the bits of expo-sqlite that src/db/index.ts uses.
 * Web build picks up driver.web.ts instead via Metro platform extensions.
 */
export {
  openDatabaseSync,
  type SQLiteDatabase,
} from 'expo-sqlite';

export async function ensureDbReady(): Promise<void> {
  // expo-sqlite is sync-ready on native; nothing to do.
}
