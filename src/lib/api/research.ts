import type { ResearchEvent } from "@/lib/research/types";
import { request } from "./request";

export async function startResearch(
  query: string,
  signal: AbortSignal,
  onEvent: (event: ResearchEvent) => void,
): Promise<void> {
  const response = await request("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { code?: string } | null;
    throw new Error(
      body?.code ??
        (response.status === 401
          ? "login"
          : response.status === 429
            ? "busy"
            : "research_failed"),
    );
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("research_failed");

  let pending = "";
  let complete = false;
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const lines = pending.split("\n");
    pending = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as ResearchEvent;
      if (event.type === "error") throw new Error(event.code);
      if (event.type === "report") complete = true;
      onEvent(event);
    }
  }

  if (!complete) throw new Error("research_failed");
}
