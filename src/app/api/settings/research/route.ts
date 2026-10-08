import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  getResearchSettings,
  saveResearchSettings,
} from "@/lib/research/settings-server";

export const runtime = "nodejs";

const settingsSchema = z.object({
  maxQueries: z.number().int().min(1).max(10),
  maxSources: z.number().int().min(1).max(20),
  maxSourceChars: z.number().int().min(1_000).max(50_000),
  maxHtmlBytes: z.number().int().min(100_000).max(10_000_000),
  maxClaims: z.number().int().min(1).max(30),
  maxSections: z.number().int().min(1).max(15),
  maxParagraphs: z.number().int().min(1).max(15),
  maxOutputTokens: z.number().int().min(1_000).max(64_000),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  return NextResponse.json(await getResearchSettings(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const input = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ code: "invalid_research_settings" }, { status: 400 });
  }

  return NextResponse.json(await saveResearchSettings(input.data), {
    headers: { "Cache-Control": "no-store" },
  });
}
