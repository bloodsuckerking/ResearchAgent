import { z } from "zod";
import { getLlmRuntimeConfig } from "@/lib/llm/connection";
import { getResearchSettings } from "./settings-server";
import { model } from "./model";
import { searchAndRead } from "./web";
import type { ResearchEvent } from "./types";

const ids = z.array(z.number().int().positive());
function stringifyText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map(stringifyText).filter(Boolean).join("\n");
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["text", "content", "title", "recommendation", "description", "body"]) {
      if (typeof record[key] === "string" && record[key].trim()) {
        return record[key].trim();
      }
    }
    return Object.values(record).map(stringifyText).filter(Boolean).join(" ");
  }
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

const textValue = z.unknown().transform(stringifyText);
const claimSchema = z.object({
  claim: textValue,
  evidence: textValue,
  sourceIds: ids,
  status: z.enum(["supported", "conflict", "insufficient"]),
});
const claimsSchema = z.object({ claims: z.array(claimSchema) });
const reportSchema = z.object({
  title: textValue,
  summary: textValue,
  sections: z
    .array(
      z.object({
        title: textValue,
        paragraphs: z.array(z.object({ text: textValue, sourceIds: ids })),
      }),
    )
    .min(1),
  recommendations: textValue,
  limitations: textValue,
});

function normalizeClaims(
  value: z.infer<typeof claimsSchema>,
  maxClaims: number,
) {
  return value.claims.slice(0, maxClaims);
}

function normalizeReport(
  value: z.infer<typeof reportSchema>,
  maxSections: number,
  maxParagraphs: number,
) {
  return {
    ...value,
    sections: value.sections.slice(0, maxSections).map((section) => ({
      ...section,
      paragraphs: section.paragraphs.slice(0, maxParagraphs),
    })),
  };
}

export async function runResearch(
  query: string,
  locale: string,
  signal: AbortSignal,
  emit: (event: ResearchEvent) => void,
) {
  const language = locale.startsWith("zh") ? "Simplified Chinese" : "English";
  const [runtimeConfig, researchSettings] = await Promise.all([
    getLlmRuntimeConfig(),
    getResearchSettings(),
  ]);
  emit({ type: "stage", stage: 0 });
  emit({ type: "activity", stage: 0, activity: "planning" });

  const planned = z
    .object({
      plan: z.array(z.string()).min(2),
      queries: z.array(z.string()).min(1),
    })
    .parse(
      await model(
        `Plan a focused web research task. Output {plan:string[],queries:string[]}. Return 2-6 plan steps and 1-${researchSettings.maxQueries} search queries. Queries must be precise, varied and prioritize official primary sources. Plan language: ` +
          language,
        { query, date: new Date().toISOString().slice(0, 10) },
        signal,
        runtimeConfig,
        { maxTokens: researchSettings.maxOutputTokens },
      ),
    );
  const plan = {
    plan: planned.plan.slice(0, 6),
    queries: planned.queries.slice(0, researchSettings.maxQueries),
  };

  emit({ type: "plan", plan: plan.plan });
  emit({ type: "activity", stage: 0, activity: "planned" });
  emit({ type: "stage", stage: 1 });
  emit({ type: "activity", stage: 1, activity: "searching", total: plan.queries.length });

  const sources = await searchAndRead(
    plan.queries,
    signal,
    (progress) => {
    if (progress.type === "search_started") {
      emit({
        type: "activity",
        stage: 1,
        activity: "searching",
        query: progress.query,
        count: progress.index,
        total: progress.total,
      });
      return;
    }
    if (progress.type === "search_complete") {
      emit({
        type: "activity",
        stage: 1,
        activity: "search_complete",
        count: progress.count,
        total: progress.total,
      });
      return;
    }
    if (progress.type === "source_found") {
      emit({
        type: "activity",
        stage: 1,
        activity: "searching",
        source: progress.source,
        count: progress.source.id,
      });
      return;
    }
    emit({
      type: "activity",
      stage: 2,
      activity: "reading",
      source: progress.source,
      count: progress.index,
      total: progress.total,
    });
    },
    {
      maxQueries: researchSettings.maxQueries,
      maxSources: researchSettings.maxSources,
      maxSourceChars: researchSettings.maxSourceChars,
      maxHtmlBytes: researchSettings.maxHtmlBytes,
    },
  );
  emit({ type: "sources", sources });
  emit({ type: "stage", stage: 2 });
  emit({ type: "activity", stage: 2, activity: "sources_ready", count: sources.length });

  emit({ type: "activity", stage: 2, activity: "extracting" });
  const extraction = normalizeClaims(
    claimsSchema.parse(
      await model(
        `Extract up to ${researchSettings.maxClaims} important claims from supplied evidence. Output {claims:[{claim,evidence,sourceIds:number[],status:"supported"|"conflict"|"insufficient"}]}. Return at most ${researchSettings.maxClaims} claims. Include a short exact evidence excerpt. Search snippets are limited evidence. If irrelevant say insufficient. Language: ` +
          language,
        { query, sources },
        signal,
        runtimeConfig,
        { maxTokens: researchSettings.maxOutputTokens },
      ),
    ),
    researchSettings.maxClaims,
  );
  emit({ type: "activity", stage: 2, activity: "extracted", count: extraction.length });
  emit({ type: "stage", stage: 3 });
  emit({ type: "activity", stage: 3, activity: "verifying" });

  const verified = normalizeClaims(
    claimsSchema.parse(
      await model(
        `Critically review these claims against the supplied sources. Return the same claims schema {claims:[{claim,evidence,sourceIds,status}]}. Return at most ${researchSettings.maxClaims} claims. Check whether quoted evidence actually supports the claim, distinguish contradictions and missing evidence. A single source is not independent verification; never claim definitive truth. Remove nonexistent source IDs. Language: ` +
          language,
        { query, claims: extraction, sources },
        signal,
        runtimeConfig,
        { maxTokens: researchSettings.maxOutputTokens },
      ),
    ),
    researchSettings.maxClaims,
  );

  const validIds = new Set(sources.map((source) => source.id));
  const claims = verified.map((claim) => ({
    ...claim,
    sourceIds: claim.sourceIds.filter((id) => validIds.has(id)),
  }));
  emit({ type: "claims", claims });
  emit({ type: "activity", stage: 3, activity: "verified", count: claims.length });
  emit({ type: "stage", stage: 4 });
  emit({ type: "activity", stage: 4, activity: "writing" });

  const report = normalizeReport(
    reportSchema.parse(
      await model(
        `Write a rigorous concise cited research report using ONLY supplied evidence. Output {title,summary,sections:[{title,paragraphs:[{text,sourceIds:number[]}]}],recommendations,limitations}. Return at most ${researchSettings.maxSections} sections and at most ${researchSettings.maxParagraphs} paragraphs per section. Include methodology and detailed analysis sections. Cite each substantive paragraph using valid source IDs. No markdown or URLs in text. Summary and recommendations should only restate cited findings. If search results are irrelevant explicitly say evidence is insufficient instead of answering from memory. State search and page-reading limitations, automated verification is not independent fact checking. Language: ` +
          language,
        { query, plan: plan.plan, sources, claims },
        signal,
        runtimeConfig,
        { maxTokens: researchSettings.maxOutputTokens },
      ),
    ),
    researchSettings.maxSections,
    researchSettings.maxParagraphs,
  );

  report.sections.forEach((section) =>
    section.paragraphs.forEach((paragraph) => {
      paragraph.sourceIds = paragraph.sourceIds.filter((id) => validIds.has(id));
    }),
  );

  emit({ type: "report", report });
  emit({ type: "activity", stage: 5, activity: "complete" });
  return { report, sources, claims, plan: plan.plan };
}
