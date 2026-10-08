import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { db, resolveDatabasePath, sqlite } from "./client";

const runMigrate = () => {
  const migrationsFolder = path.join(process.cwd(), "src/lib/db/migrations");
  console.log(`⏳ Running migrations against ${resolveDatabasePath()}...`);
  const start = Date.now();
  migrate(db, { migrationsFolder });
  console.log("✅ Migrations completed in", Date.now() - start, "ms");
  sqlite.close();
};

try {
  runMigrate();
} catch (error) {
  console.error("❌ Migration failed");
  console.error(error);
  try {
    sqlite.close();
  } catch {
    // Already closed.
  }
  process.exit(1);
}
