import "server-only";

import {
  getResearchSettingsRow,
  saveResearchSettingsRow,
} from "@/lib/db/queries/settings";
import {
  DEFAULT_RESEARCH_SETTINGS,
  normalizeResearchSettings,
  type ResearchSettings,
} from "./settings";

export async function getResearchSettings(): Promise<ResearchSettings> {
  const row = await getResearchSettingsRow();
  if (!row) return DEFAULT_RESEARCH_SETTINGS;

  return normalizeResearchSettings({
    maxQueries: row.maxQueries,
    maxSources: row.maxSources,
    maxSourceChars: row.maxSourceChars,
    maxHtmlBytes: row.maxHtmlBytes,
    maxClaims: row.maxClaims,
    maxSections: row.maxSections,
    maxParagraphs: row.maxParagraphs,
    maxOutputTokens: row.maxOutputTokens,
  });
}

export async function saveResearchSettings(
  value: ResearchSettings,
): Promise<ResearchSettings> {
  const normalized = normalizeResearchSettings(value);
  await saveResearchSettingsRow(normalized);
  return normalized;
}
