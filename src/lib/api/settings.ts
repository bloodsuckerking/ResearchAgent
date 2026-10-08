import { request } from "./request";

export type LlmPublicConfig = {
  configured: boolean;
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
};

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

export type LlmDraftInput = {
  baseUrl: string;
  model: string;
  apiKey?: string;
};

type ErrorBody = { code?: string };

async function read<T>(
  path: string,
  fallback: string,
  init?: RequestInit,
): Promise<T> {
  const response = await request(path, init);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorBody | null;
    throw new Error(body?.code ?? fallback);
  }
  return response.json() as Promise<T>;
}

export function getLlmConfig(): Promise<LlmPublicConfig> {
  return read("/api/settings/llm", "settings_failed");
}

export function saveLlmConfig(input: LlmDraftInput): Promise<LlmPublicConfig> {
  return read("/api/settings/llm", "settings_failed", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function testLlmConfig(input: LlmDraftInput): Promise<{ ok: true }> {
  return read("/api/settings/llm/test", "connection_failed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function getResearchSettings(): Promise<ResearchSettings> {
  return read("/api/settings/research", "settings_failed");
}

export function saveResearchSettings(
  input: ResearchSettings,
): Promise<ResearchSettings> {
  return read("/api/settings/research", "settings_failed", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
