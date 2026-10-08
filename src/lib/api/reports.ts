import { request } from "./request";
import type { Claim, Report, Source } from "@/lib/research/types";

export type HistoryItem = {
  id: string;
  query: string;
  title: string;
  createdAt: string;
};

export type SavedReport = HistoryItem & {
  snapshot: {
    report: Report;
    sources: Source[];
    claims: Claim[];
    plan: string[];
  };
};

async function read<T>(path: string, method = "GET"): Promise<T> {
  const response = await request(path, { method });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { code?: string } | null;
    throw new Error(body?.code ?? "operation_failed");
  }
  return response.json() as Promise<T>;
}

export function listHistory(): Promise<HistoryItem[]> {
  return read("/api/reports");
}

export function loadHistory(id: string): Promise<SavedReport> {
  return read("/api/reports?id=" + encodeURIComponent(id));
}

export function removeHistory(id: string): Promise<{ deleted: boolean }> {
  return read("/api/reports?id=" + encodeURIComponent(id), "DELETE");
}
