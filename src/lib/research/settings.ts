export type ResearchSettings = {
  maxQueries: number;
  maxSources: number;
  maxSourceChars: number;
  maxHtmlBytes: number;
  maxClaims: number;
  maxSections: number;
  maxParagraphs: number;
  maxOutputTokens: number;
};

export const DEFAULT_RESEARCH_SETTINGS: ResearchSettings = {
  maxQueries: 3,
  maxSources: 8,
  maxSourceChars: 9_000,
  maxHtmlBytes: 1_500_000,
  maxClaims: 12,
  maxSections: 8,
  maxParagraphs: 8,
  maxOutputTokens: 16_000,
};

export const RESEARCH_SETTINGS_LIMITS: Record<
  keyof ResearchSettings,
  { min: number; max: number; step: number }
> = {
  maxQueries: { min: 1, max: 10, step: 1 },
  maxSources: { min: 1, max: 20, step: 1 },
  maxSourceChars: { min: 1_000, max: 50_000, step: 500 },
  maxHtmlBytes: { min: 100_000, max: 10_000_000, step: 100_000 },
  maxClaims: { min: 1, max: 30, step: 1 },
  maxSections: { min: 1, max: 15, step: 1 },
  maxParagraphs: { min: 1, max: 15, step: 1 },
  maxOutputTokens: { min: 1_000, max: 64_000, step: 1_000 },
};

export function normalizeResearchSettings(
  value: Partial<ResearchSettings> | null | undefined,
): ResearchSettings {
  const normalized = { ...DEFAULT_RESEARCH_SETTINGS };
  if (!value) return normalized;

  for (const key of Object.keys(DEFAULT_RESEARCH_SETTINGS) as Array<keyof ResearchSettings>) {
    const candidate = value[key];
    const limits = RESEARCH_SETTINGS_LIMITS[key];
    if (typeof candidate !== "number" || !Number.isFinite(candidate)) continue;
    normalized[key] = Math.min(limits.max, Math.max(limits.min, Math.round(candidate)));
  }

  return normalized;
}
