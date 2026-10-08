"use client";

import { reportMarkdown } from "./export";
import type { Claim, Report, Source } from "./types";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function reportFileName(title: string, createdAt?: string) {
  const date = createdAt ? new Date(createdAt) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const stamp = `${safeDate.getFullYear()}${pad(safeDate.getMonth() + 1)}${pad(safeDate.getDate())}-${pad(safeDate.getHours())}${pad(safeDate.getMinutes())}`;
  const safeTitle = title
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return `${safeTitle || "research-report"}-${stamp}.md`;
}

export function downloadReportMarkdown(
  report: Report,
  sources: Source[],
  claims: Claim[],
  createdAt?: string,
) {
  const markdown = reportMarkdown(report, sources, claims);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = reportFileName(report.title, createdAt);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
