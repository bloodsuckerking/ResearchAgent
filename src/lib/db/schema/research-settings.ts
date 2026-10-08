import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const researchSettings = sqliteTable("research_settings", {
  id: text("id").primaryKey(),
  maxQueries: integer("max_queries").notNull().default(3),
  maxSources: integer("max_sources").notNull().default(8),
  maxSourceChars: integer("max_source_chars").notNull().default(9_000),
  maxHtmlBytes: integer("max_html_bytes").notNull().default(1_500_000),
  maxClaims: integer("max_claims").notNull().default(12),
  maxSections: integer("max_sections").notNull().default(8),
  maxParagraphs: integer("max_paragraphs").notNull().default(8),
  maxOutputTokens: integer("max_output_tokens").notNull().default(16_000),
});
