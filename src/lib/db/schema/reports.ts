import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Claim, Report, Source } from "@/lib/research/types";
import { users } from "./users";

export type ResearchSnapshot = {
  report: Report;
  sources: Source[];
  claims: Claim[];
  plan: string[];
};

export const reports = sqliteTable(
  "research_reports",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    title: text("title").notNull(),
    snapshot: text("snapshot", { mode: "json" })
      .$type<ResearchSnapshot>()
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("reports_owner_created_idx").on(table.userId, table.createdAt),
  ],
);
