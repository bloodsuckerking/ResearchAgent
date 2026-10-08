"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, LoaderCircle, Settings, X } from "lucide-react";
import {
  getLlmConfig,
  getResearchSettings,
  saveLlmConfig,
  saveResearchSettings,
  testLlmConfig,
  type LlmPublicConfig,
  type ResearchSettings,
} from "@/lib/api";
import {
  DEFAULT_RESEARCH_SETTINGS,
  RESEARCH_SETTINGS_LIMITS,
} from "@/lib/research/settings";

type FormState = {
  baseUrl: string;
  model: string;
  apiKey: string;
};

const emptyForm: FormState = { baseUrl: "", model: "", apiKey: "" };

const researchFields: Array<{
  key: keyof ResearchSettings;
  label: string;
  hint: string;
}> = [
  { key: "maxQueries", label: "maxQueries", hint: "maxQueriesHint" },
  { key: "maxSources", label: "maxSources", hint: "maxSourcesHint" },
  { key: "maxSourceChars", label: "maxSourceChars", hint: "maxSourceCharsHint" },
  { key: "maxHtmlBytes", label: "maxHtmlBytes", hint: "maxHtmlBytesHint" },
  { key: "maxClaims", label: "maxClaims", hint: "maxClaimsHint" },
  { key: "maxSections", label: "maxSections", hint: "maxSectionsHint" },
  { key: "maxParagraphs", label: "maxParagraphs", hint: "maxParagraphsHint" },
  { key: "maxOutputTokens", label: "maxOutputTokens", hint: "maxOutputTokensHint" },
];

export function LlmSettings() {
  const { t } = useTranslation();
  const tr = (key: string) => t("research.settings." + key);
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [research, setResearch] = useState<ResearchSettings>(
    DEFAULT_RESEARCH_SETTINGS,
  );
  const [saved, setSaved] = useState<LlmPublicConfig | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [showKey, setShowKey] = useState(false);

  async function open() {
    dialog.current?.showModal();
    setStatus("loading");
    setBusy(true);
    try {
      const [config, savedResearch] = await Promise.all([
        getLlmConfig(),
        getResearchSettings(),
      ]);
      setSaved(config);
      setResearch(savedResearch);
      setForm({ baseUrl: config.baseUrl, model: config.model, apiKey: "" });
      setStatus(config.configured ? "configured" : "notReady");
    } catch {
      setStatus("testFailed");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    if (!form.baseUrl.trim() || !form.model.trim()) {
      setStatus("required");
      return;
    }
    setBusy(true);
    setStatus("testing");
    try {
      await testLlmConfig(form);
      setStatus("testPassed");
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setStatus(code === "rate_limited" ? "rateLimit" : "testFailed");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!form.baseUrl.trim() || !form.model.trim()) {
      setStatus("required");
      return;
    }
    setBusy(true);
    setStatus("saving");
    try {
      const config = await saveLlmConfig(form);
      setSaved(config);
      setForm((current) => ({ ...current, apiKey: "" }));
      setStatus("saved");
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setStatus(code === "encryption_key_missing" ? "encryptionMissing" : "saveFailed");
    } finally {
      setBusy(false);
    }
  }

  async function saveResearch() {
    setBusy(true);
    setStatus("researchSaving");
    try {
      setResearch(await saveResearchSettings(research));
      setStatus("researchSaved");
    } catch {
      setStatus("researchSaveFailed");
    } finally {
      setBusy(false);
    }
  }

  function updateResearch(key: keyof ResearchSettings, value: string) {
    const limits = RESEARCH_SETTINGS_LIMITS[key];
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    setResearch((current) => ({
      ...current,
      [key]: Math.min(limits.max, Math.max(limits.min, Math.round(parsed))),
    }));
  }

  const statusText: Record<string, string> = {
    loading: tr("loading"),
    configured: tr("configured"),
    notReady: tr("notReady"),
    testPassed: tr("testPassed"),
    testing: tr("testing"),
    rateLimit: tr("rateLimit"),
    required: tr("required"),
    saving: tr("saving"),
    saved: tr("saved"),
    encryptionMissing: tr("encryptionMissing"),
    testFailed: tr("testFailed"),
    saveFailed: tr("saveFailed"),
    researchSaving: tr("researchSaving"),
    researchSaved: tr("researchSaved"),
    researchSaveFailed: tr("researchSaveFailed"),
  };

  return (
    <>
      <button
        className="quiet settings-trigger"
        onClick={() => void open()}
        aria-label={tr("title")}
        data-el="llm-settings-trigger"
      >
        <Settings size={16} />
        <span>{tr("title")}</span>
      </button>

      <dialog className="llm-settings" ref={dialog} aria-labelledby="llm-settings-title">
        <div className="settings-heading">
          <div>
            <span className="eyebrow">MODEL CONNECTION</span>
            <h2 id="llm-settings-title">{tr("title")}</h2>
          </div>
          <button
            className="quiet"
            aria-label={tr("close")}
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>

        <div className="settings-notice">
          <strong>{tr("activeTitle")}</strong>
          <p>{saved?.configured ? tr("activeConfigured") : tr("activeNote")}</p>
        </div>

        <label htmlFor="llm-base-url">{tr("baseUrl")}</label>
        <input
          id="llm-base-url"
          value={form.baseUrl}
          onChange={(event) => setForm({ ...form, baseUrl: event.target.value })}
          placeholder="https://api.deepseek.com/v1"
          disabled={busy}
          autoComplete="url"
          data-el="llm-base-url"
        />
        <small>{tr("urlHint")}</small>

        <label htmlFor="llm-model">{tr("model")}</label>
        <input
          id="llm-model"
          value={form.model}
          onChange={(event) => setForm({ ...form, model: event.target.value })}
          placeholder="deepseek-chat"
          disabled={busy}
          data-el="llm-model"
        />

        <label htmlFor="llm-api-key">{tr("apiKey")}</label>
        <div className="settings-secret">
          <input
            id="llm-api-key"
            type={showKey ? "text" : "password"}
            value={form.apiKey}
            onChange={(event) => setForm({ ...form, apiKey: event.target.value })}
            placeholder={saved?.apiKeyMasked ?? tr("keyPlaceholder")}
            disabled={busy}
            autoComplete="off"
            data-el="llm-api-key"
          />
          <button
            type="button"
            className="quiet"
            aria-label={tr(showKey ? "hide" : "show")}
            disabled={busy}
            onClick={() => setShowKey((value) => !value)}
          >
            {showKey ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <small>{saved?.hasApiKey ? tr("keepKeyHint") : tr("keyHint")}</small>

        <div className="settings-actions">
          <button
            type="button"
            className="quiet"
            disabled={busy}
            onClick={() => void test()}
            data-el="llm-test"
          >
            {busy && status === "testing" ? tr("testing") : tr("test")}
          </button>
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => void save()}
            data-el="llm-save"
          >
            {tr("save")}
          </button>
        </div>
        <small className="settings-footnote">{tr("testCost")}</small>

        <div className="settings-divider" />
        <div className="settings-section-heading">
          <strong>{tr("researchTitle")}</strong>
          <p>{tr("researchNote")}</p>
        </div>
        <div className="research-settings-grid">
          {researchFields.map((field) => {
            const limits = RESEARCH_SETTINGS_LIMITS[field.key];
            return (
              <label className="research-setting" key={field.key}>
                <span>{tr(field.label)}</span>
                <input
                  type="number"
                  min={limits.min}
                  max={limits.max}
                  step={limits.step}
                  value={research[field.key]}
                  disabled={busy}
                  onChange={(event) => updateResearch(field.key, event.target.value)}
                />
                <small>{tr(field.hint)}</small>
              </label>
            );
          })}
        </div>
        <div className="settings-actions research-settings-actions">
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => void saveResearch()}
            data-el="research-settings-save"
          >
            {tr("saveResearch")}
          </button>
        </div>

        <p role="status" className="settings-status">
          {busy && <LoaderCircle className="animate-spin" size={14} />}
          {statusText[status] ?? tr("loading")}
        </p>
      </dialog>
    </>
  );
}
