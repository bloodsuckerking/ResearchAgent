import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const llmConnections = sqliteTable("llm_connections", {
  id: text("id").primaryKey(),
  baseUrl: text("base_url").notNull(),
  model: text("model").notNull(),
  apiKeyCiphertext: text("api_key_ciphertext"),
  apiKeyLast4: text("api_key_last4"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
