import Database from "better-sqlite3";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

config({ path: ".env" });

export function resolveDatabasePath() {
  const configured = process.env.DATABASE_PATH?.trim() || "./data/research-agent.sqlite";
  return path.resolve(process.cwd(), configured);
}

const databasePath = resolveDatabasePath();
mkdirSync(path.dirname(databasePath), { recursive: true });

export const sqlite = new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");

export const db = drizzle(sqlite);
