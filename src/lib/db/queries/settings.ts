import { eq } from "drizzle-orm";
import { db } from "../client";
import { llmConnections } from "../schema/llm";
import { researchSettings } from "../schema/research-settings";
import type { ResearchSettings } from "@/lib/research/settings";

export const DEFAULT_SETTINGS_ID = "default";

export async function getLlmConnectionRow() {
  return db
    .select()
    .from(llmConnections)
    .where(eq(llmConnections.id, DEFAULT_SETTINGS_ID))
    .get();
}

export async function saveLlmConnectionRow(data: {
  baseUrl: string;
  model: string;
  apiKeyCiphertext: string | null;
  apiKeyLast4: string | null;
}) {
  return db
    .insert(llmConnections)
    .values({ id: DEFAULT_SETTINGS_ID, ...data })
    .onConflictDoUpdate({
      target: llmConnections.id,
      set: { ...data, updatedAt: new Date() },
    })
    .returning()
    .get();
}

export async function getResearchSettingsRow() {
  return db
    .select()
    .from(researchSettings)
    .where(eq(researchSettings.id, DEFAULT_SETTINGS_ID))
    .get();
}

export async function saveResearchSettingsRow(data: ResearchSettings) {
  return db
    .insert(researchSettings)
    .values({ id: DEFAULT_SETTINGS_ID, ...data })
    .onConflictDoUpdate({
      target: researchSettings.id,
      set: data,
    })
    .returning()
    .get();
}
