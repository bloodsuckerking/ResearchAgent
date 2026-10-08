import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { saveReport } from "@/lib/db/queries/reports";
import { LlmNotConfiguredError, ModelRequestError } from "@/lib/research/model";
import { runResearch } from "@/lib/research/run";

export const runtime = "nodejs";
export const maxDuration = 300;

const running = new Set<string>();

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const input = await request.json().catch(() => null);
  if (
    typeof input?.query !== "string" ||
    input.query.trim().length < 4 ||
    input.query.length > 600
  ) {
    return NextResponse.json({ code: "invalid_query" }, { status: 400 });
  }

  if (running.has(auth.user.id)) {
    return NextResponse.json({ code: "busy" }, { status: 429 });
  }
  running.add(auth.user.id);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 270_000);
  request.signal.addEventListener("abort", () => controller.abort(), { once: true });
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(output) {
      const emit = (data: unknown) => {
        if (!controller.signal.aborted) {
          output.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
        }
      };

      try {
        const snapshot = await runResearch(
          input.query.trim(),
          request.headers.get("x-app-locale") || "zh-CN",
          controller.signal,
          emit,
        );
        try {
          await saveReport(auth.user.id, input.query.trim(), snapshot);
          emit({ type: "saved" });
        } catch {
          emit({ type: "warning", code: "save_failed" });
        }
      } catch (error) {
        console.error(
          "[research] failed",
          error instanceof Error ? `${error.name}: ${error.message}` : "unknown error",
        );
        const code =
          error instanceof LlmNotConfiguredError
            ? "llm_not_configured"
            : error instanceof ModelRequestError
              ? "model_unavailable"
              : controller.signal.aborted
                ? "timeout"
                : "research_failed";
        try {
          output.enqueue(encoder.encode(JSON.stringify({ type: "error", code }) + "\n"));
        } catch {
          // The client disconnected.
        }
      } finally {
        clearTimeout(timer);
        running.delete(auth.user.id);
        try {
          output.close();
        } catch {
          // Already closed by the client.
        }
      }
    },
    cancel() {
      controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
