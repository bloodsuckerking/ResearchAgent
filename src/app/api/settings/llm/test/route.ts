import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  InvalidLlmConfigError,
  testDraftConfig,
} from "@/lib/llm/connection";
import { EncryptionKeyMissingError } from "@/lib/llm/encryption";
import { ModelRequestError } from "@/lib/llm/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({
  baseUrl: z.string().trim().min(1).max(2_048),
  model: z.string().trim().min(1).max(256),
  apiKey: z.string().max(8_192).optional().default(""),
});

const tests = new Map<string, number>();
const TEST_COOLDOWN_MS = 10_000;

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const now = Date.now();
  for (const [userId, timestamp] of tests) {
    if (now - timestamp > TEST_COOLDOWN_MS) tests.delete(userId);
  }
  if (tests.has(auth.user.id)) {
    return NextResponse.json({ code: "rate_limited" }, { status: 429 });
  }
  tests.set(auth.user.id, now);

  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ code: "invalid_llm_config" }, { status: 400 });
  }

  try {
    await testDraftConfig(
      input.data,
      AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidLlmConfigError) {
      return NextResponse.json({ code: error.code }, { status: 400 });
    }
    if (error instanceof EncryptionKeyMissingError) {
      return NextResponse.json({ code: error.code }, { status: 500 });
    }
    if (error instanceof ModelRequestError || error instanceof Error) {
      return NextResponse.json({ code: "connection_failed" }, { status: 503 });
    }
    return NextResponse.json({ code: "connection_failed" }, { status: 503 });
  }
}
