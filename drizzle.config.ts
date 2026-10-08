import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import path from "node:path";

config({ path: ".env" });

const databasePath = path.resolve(
  process.cwd(),
  process.env.DATABASE_PATH?.trim() || "./data/research-agent.sqlite",
);

export default defineConfig({
  schema: "./src/lib/db/schema",
  out: "./src/lib/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: databasePath,
  },
});
