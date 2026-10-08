CREATE TABLE `research_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`max_queries` integer DEFAULT 3 NOT NULL,
	`max_sources` integer DEFAULT 8 NOT NULL,
	`max_source_chars` integer DEFAULT 9000 NOT NULL,
	`max_html_bytes` integer DEFAULT 1500000 NOT NULL,
	`max_claims` integer DEFAULT 12 NOT NULL,
	`max_sections` integer DEFAULT 8 NOT NULL,
	`max_paragraphs` integer DEFAULT 8 NOT NULL,
	`max_output_tokens` integer DEFAULT 16000 NOT NULL
);
