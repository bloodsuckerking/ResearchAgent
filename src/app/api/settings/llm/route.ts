import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  getLlmPublicConfig,
  InvalidLlmConfigError,
  saveLlmConfig,
} from "@/lib/llm/connection";
import { EncryptionKeyMissingError } from "@/lib/llm/encryption";

export const runtime = "nodejs";

const inputSchema = z.object({
  baseUrl: z.string().trim().min(1).max(2_048),
  model: z.string().trim().min(1).max(256),
  apiKey: z.string().max(8_192).optional().default(""),
});

function errorResponse(error: unknown) {
  if (error instanceof InvalidLlmConfigError) {
    return NextResponse.json({ code: error.code }, { status: 400 });
  }
  if (error instanceof EncryptionKeyMissingError) {
    return NextResponse.json({ code: error.code }, { status: 500 });
  }
  console.error("[settings/llm] failed", error);
  return NextResponse.json({ code: "settings_failed" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json(await getLlmPublicConfig(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ code: "invalid_llm_config" }, { status: 400 });
  }

  try {
    return NextResponse.json(await saveLlmConfig(input.data), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
