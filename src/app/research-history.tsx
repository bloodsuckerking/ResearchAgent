"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, History, X } from "lucide-react";
import { downloadReportMarkdown } from "@/lib/research/download";
import {
  listHistory,
  loadHistory,
  removeHistory,
  type HistoryItem,
  type SavedReport,
} from "@/lib/api";

export function ResearchHistory({
  onLoad,
  disabled,
}: {
  onLoad: (report: SavedReport) => void;
  disabled: boolean;
}) {
  const { t, i18n } = useTranslation();
  const tr = (key: string) => t("research.history." + key);
  const dialog = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function open() {
    setItems([]);
    setError("");
    dialog.current?.showModal();
    setBusy(true);
    try {
      setItems(await listHistory());
    } catch {
      setError(tr("failed"));
    } finally {
      setBusy(false);
    }
  }

  async function load(id: string) {
    setBusy(true);
    setError("");
    try {
      const row = await loadHistory(id);
      onLoad(row);
      dialog.current?.close();
    } catch {
      setError(tr("failed"));
    } finally {
      setBusy(false);
    }
  }

  async function download(id: string) {
    setBusy(true);
    setError("");
    try {
      const row = await loadHistory(id);
      downloadReportMarkdown(
        row.snapshot.report,
        row.snapshot.sources,
        row.snapshot.claims,
        row.createdAt,
      );
    } catch {
      setError(tr("failed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(tr("confirm"))) return;
    setBusy(true);
    setError("");
    try {
      await removeHistory(id);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch {
      setError(tr("failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="quiet settings-trigger"
        disabled={disabled}
        aria-label={tr("title")}
        onClick={() => void open()}
        data-el="research-history-trigger"
      >
        <History size={16} />
        <span>{tr("title")}</span>
      </button>

      <dialog className="llm-settings" ref={dialog} aria-labelledby="history-title">
        <div className="settings-heading">
          <h2 id="history-title">{tr("title")}</h2>
          <button
            className="quiet"
            aria-label={tr("close")}
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <p>{tr("note")}</p>
        {busy && <p role="status">{tr("loading")}</p>}
        {error && (
          <p role="alert">
            {error}
            <button className="quiet" onClick={() => void open()}>
              {tr("retry")}
            </button>
          </p>
        )}
        {!busy && !error && items.length === 0 && <p>{tr("empty")}</p>}
        {items.map((item) => (
          <article className="history-item" key={item.id}>
            <button
              className="quiet history-title"
              disabled={busy}
              onClick={() => void load(item.id)}
            >
              {item.title}
            </button>
            <small>{new Date(item.createdAt).toLocaleString(i18n.language)}</small>
            <div className="history-actions">
              <button
                className="quiet"
                disabled={busy}
                onClick={() => void download(item.id)}
              >
                <Download size={13} />
                {tr("download")}
              </button>
              <button
                className="quiet"
                disabled={busy}
                onClick={() => void remove(item.id)}
              >
                {tr("delete")}
              </button>
            </div>
          </article>
        ))}
      </dialog>
    </>
  );
}
