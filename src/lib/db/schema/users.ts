import type { InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").unique(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    passwordHash: text("password_hash"),
    isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_created_at_idx").on(table.createdAt),
  ],
);

export type User = InferSelectModel<typeof users>;
