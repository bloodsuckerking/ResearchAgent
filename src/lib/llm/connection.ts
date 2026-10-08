import "server-only";

import { decryptSecret, encryptSecret } from "./encryption";
import {
  getLlmConnectionRow,
  saveLlmConnectionRow,
} from "@/lib/db/queries/settings";
import {
  testLlmConnection,
  type LlmRuntimeConfig,
} from "./openai";

export type LlmPublicConfig = {
  configured: boolean;
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
};

export type LlmDraftInput = {
  baseUrl: string;
  model: string;
  apiKey?: string;
};

export class LlmNotConfiguredError extends Error {
  readonly code = "llm_not_configured";
}

export class InvalidLlmConfigError extends Error {
  readonly code = "invalid_llm_config";
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new InvalidLlmConfigError("baseUrl is required");

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new InvalidLlmConfigError("baseUrl must be a valid URL");
  }

  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new InvalidLlmConfigError("baseUrl is not allowed");
  }

  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}

function normalizeDraft(input: LlmDraftInput): LlmDraftInput {
  const model = input.model.trim();
  if (!model) throw new InvalidLlmConfigError("model is required");
  return {
    baseUrl: normalizeBaseUrl(input.baseUrl),
    model,
    apiKey: input.apiKey?.trim() || undefined,
  };
}

function maskedKey(last4: string | null) {
  return last4 ? `••••••••${last4}` : null;
}

export async function getLlmPublicConfig(): Promise<LlmPublicConfig> {
  const row = await getLlmConnectionRow();
  if (!row) {
    return {
      configured: false,
      baseUrl: "",
      model: "",
      hasApiKey: false,
      apiKeyMasked: null,
    };
  }

  return {
    configured: true,
    baseUrl: row.baseUrl,
    model: row.model,
    hasApiKey: Boolean(row.apiKeyCiphertext),
    apiKeyMasked: maskedKey(row.apiKeyLast4),
  };
}

export async function getLlmRuntimeConfig(): Promise<LlmRuntimeConfig> {
  const row = await getLlmConnectionRow();
  if (!row) throw new LlmNotConfiguredError("LLM connection is not configured");

  return {
    baseUrl: row.baseUrl,
    model: row.model,
    apiKey: row.apiKeyCiphertext ? decryptSecret(row.apiKeyCiphertext) : undefined,
  };
}

export async function resolveDraftConfig(input: LlmDraftInput): Promise<LlmRuntimeConfig> {
  const normalized = normalizeDraft(input);
  if (normalized.apiKey) {
    return {
      baseUrl: normalized.baseUrl,
      model: normalized.model,
      apiKey: normalized.apiKey,
    };
  }

  const existing = await getLlmConnectionRow();
  return {
    baseUrl: normalized.baseUrl,
    model: normalized.model,
    apiKey: existing?.apiKeyCiphertext
      ? decryptSecret(existing.apiKeyCiphertext)
      : undefined,
  };
}

export async function saveLlmConfig(input: LlmDraftInput): Promise<LlmPublicConfig> {
  const normalized = normalizeDraft(input);
  const existing = await getLlmConnectionRow();
  const nextApiKey = normalized.apiKey;
  const shouldReplaceKey = Boolean(nextApiKey);

  await saveLlmConnectionRow({
    baseUrl: normalized.baseUrl,
    model: normalized.model,
    apiKeyCiphertext: shouldReplaceKey
      ? encryptSecret(nextApiKey!)
      : existing?.apiKeyCiphertext ?? null,
    apiKeyLast4: shouldReplaceKey
      ? nextApiKey!.slice(-4)
      : existing?.apiKeyLast4 ?? null,
  });

  return getLlmPublicConfig();
}

export async function testDraftConfig(input: LlmDraftInput, signal: AbortSignal) {
  const config = await resolveDraftConfig(input);
  await testLlmConnection(config, signal);
}
