"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { FieldLabel } from "@/components/FieldLabel";
import { RiskMeter } from "@/components/RiskMeter";
import { VerdictBadge } from "@/components/VerdictBadge";
import {
  defaultDemoExample,
  demoExamples,
  type DemoExample
} from "@/lib/demoExamples";
import type { SanitizeResult, SourceType } from "@/lib/guardrail/types";

type RequestState = {
  loading: boolean;
  error: string | null;
  result: SanitizeResult | null;
};

type ApiError = {
  error?: string;
};

const initialState: RequestState = {
  loading: false,
  error: null,
  result: null
};

const sourceOptions: SourceType[] = [
  "support_ticket",
  "email",
  "slack_message",
  "webpage",
  "document",
  "tool_output",
  "manual_test"
];

function formatOption(option: string) {
  return option.replaceAll("_", " ");
}

function ResultSummary({ state }: { state: RequestState }) {
  if (state.error) {
    return (
      <div className="source-result error-box" aria-live="polite">
        <strong>Request failed</strong>
        <p>{state.error}</p>
        <p>Check the input and try again. URL and file safeguards reject unsafe sources before scanning.</p>
      </div>
    );
  }

  if (!state.result) {
    return (
      <div className="source-result source-result-empty" aria-live="polite">
        <strong>No result yet.</strong>
        <p>Run this ingestion test to see a verdict and saved-run link.</p>
      </div>
    );
  }

  return (
    <div className="source-result" aria-live="polite">
      <div className="source-result-topline">
        <VerdictBadge verdict={state.result.verdict} />
        {state.result.persisted && state.result.runId ? (
          <Link href={`/runs/${state.result.runId}`}>Open saved run</Link>
        ) : state.result.persisted === false ? (
          <span>Run not saved</span>
        ) : null}
      </div>
      <RiskMeter score={state.result.riskScore} level={state.result.riskLevel} />
      <dl className="metadata-grid compact-metadata">
        <div>
          <dt>Injection</dt>
          <dd>{state.result.containsInjection ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{state.result.sourceType.replaceAll("_", " ")}</dd>
        </div>
      </dl>
      {state.result.warnings.length > 0 ? (
        <ul className="warnings">
          {state.result.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

async function parseResponse(response: Response) {
  const payload = (await response.json()) as SanitizeResult | ApiError;

  if (!response.ok) {
    throw new Error((payload as ApiError).error ?? "Ingestion request failed.");
  }

  return payload as SanitizeResult;
}

export function SourcesTester() {
  const [activeMethod, setActiveMethod] = useState<"webhook" | "url" | "file">(
    "webhook"
  );
  const [webhookState, setWebhookState] = useState<RequestState>(initialState);
  const [urlState, setUrlState] = useState<RequestState>(initialState);
  const [fileState, setFileState] = useState<RequestState>(initialState);
  const [sourceName, setSourceName] = useState("Zendesk Demo");
  const [externalId, setExternalId] = useState(defaultDemoExample.id);
  const [selectedWebhookDemoId, setSelectedWebhookDemoId] = useState(
    defaultDemoExample.id
  );
  const [webhookSourceType, setWebhookSourceType] = useState<SourceType>(
    defaultDemoExample.sourceType
  );
  const [webhookTask, setWebhookTask] = useState(defaultDemoExample.userTask);
  const [webhookContent, setWebhookContent] = useState(defaultDemoExample.content);
  const [url, setUrl] = useState("https://example.com");
  const [urlTask, setUrlTask] = useState("Summarize this webpage for a research agent.");
  const [fileTask, setFileTask] = useState("Summarize this document.");
  const [file, setFile] = useState<File | null>(null);

  function loadWebhookDemo(example: DemoExample) {
    setSelectedWebhookDemoId(example.id);
    setWebhookSourceType(example.sourceType);
    setWebhookTask(example.userTask);
    setWebhookContent(example.content);
    setSourceName("AgentGate Demo");
    setExternalId(example.id);
    setWebhookState(initialState);
  }

  function handleWebhookDemoChange(demoId: string) {
    const example = demoExamples.find((demoExample) => demoExample.id === demoId);

    if (example) {
      loadWebhookDemo(example);
    }
  }

  async function submitWebhook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!webhookContent.trim()) {
      setWebhookState({
        loading: false,
        error: "Enter untrusted content to inspect.",
        result: null
      });
      return;
    }

    setWebhookState({ loading: true, error: null, result: null });

    try {
      const response = await fetch("/api/ingest/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userTask: webhookTask,
          sourceType: webhookSourceType,
          sourceName,
          externalId,
          content: webhookContent
        })
      });
      const result = await parseResponse(response);
      setWebhookState({ loading: false, error: null, result });
    } catch (error) {
      setWebhookState({
        loading: false,
        error: error instanceof Error ? error.message : "Webhook test failed.",
        result: null
      });
    }
  }

  async function submitUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!url.trim()) {
      setUrlState({
        loading: false,
        error: "Enter a URL to fetch.",
        result: null
      });
      return;
    }

    setUrlState({ loading: true, error: null, result: null });

    try {
      const response = await fetch("/api/ingest/url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userTask: urlTask,
          url
        })
      });
      const result = await parseResponse(response);
      setUrlState({ loading: false, error: null, result });
    } catch (error) {
      setUrlState({
        loading: false,
        error: error instanceof Error ? error.message : "URL check failed.",
        result: null
      });
    }
  }

  async function submitFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setFileState({
        loading: false,
        error: "Choose a supported text file first.",
        result: null
      });
      return;
    }

    const formData = new FormData();
    formData.append("userTask", fileTask);
    formData.append("sourceType", "document");
    formData.append("file", file);
    setFileState({ loading: true, error: null, result: null });

    try {
      const response = await fetch("/api/ingest/file", {
        method: "POST",
        body: formData
      });
      const result = await parseResponse(response);
      setFileState({ loading: false, error: null, result });
    } catch (error) {
      setFileState({
        loading: false,
        error: error instanceof Error ? error.message : "File upload failed.",
        result: null
      });
    }
  }

  return (
    <section className="sources-workbench" aria-label="Ingestion methods">
      <div className="source-console">
        <article className="source-direct">
          <p className="panel-kicker">Direct API</p>
          <h2>POST /api/sanitize</h2>
          <p>
            Send trusted task, source type, and untrusted content directly to the
            existing scanner endpoint.
          </p>
          <div className="source-method-meta">
            <span>JSON body</span>
            <span>Normalized decision</span>
            <span>Saved run support</span>
          </div>
          <Link className="button secondary-button" href="/docs#sanitize">
            Open API docs
          </Link>
        </article>

        <div className="source-security-notes">
          <strong>Safety notes</strong>
          <p>
            Private URLs are blocked, file uploads are capped at 1 MB, and
            provider keys stay server-side.
          </p>
        </div>
      </div>

      <div className="source-method-switcher" role="tablist" aria-label="Source method">
        <button
          aria-selected={activeMethod === "webhook"}
          className={activeMethod === "webhook" ? "active" : ""}
          onClick={() => setActiveMethod("webhook")}
          role="tab"
          type="button"
        >
          <span>Webhook</span>
          <strong>External system POST</strong>
        </button>
        <button
          aria-selected={activeMethod === "url"}
          className={activeMethod === "url" ? "active" : ""}
          onClick={() => setActiveMethod("url")}
          role="tab"
          type="button"
        >
          <span>URL fetch</span>
          <strong>Fetch and check</strong>
        </button>
        <button
          aria-selected={activeMethod === "file"}
          className={activeMethod === "file" ? "active" : ""}
          onClick={() => setActiveMethod("file")}
          role="tab"
          type="button"
        >
          <span>File upload</span>
          <strong>Text-like files</strong>
        </button>
      </div>

      <article className="panel source-card source-active-panel">
        {activeMethod === "webhook" ? (
          <form className="source-form" onSubmit={submitWebhook}>
            <div className="panel-heading compact">
              <div>
                <p className="panel-kicker">Webhook</p>
                <h2>External system POST</h2>
              </div>
            </div>
          <div className="demo-loader compact-demo-loader">
            <div>
              <strong>Load demo</strong>
              <p>Use these examples to test the guardrail without entering real data.</p>
            </div>
            <select
              aria-label="Load webhook demo example"
              value={selectedWebhookDemoId}
              onChange={(event) => handleWebhookDemoChange(event.target.value)}
              disabled={webhookState.loading}
            >
              {demoExamples.map((example) => (
                <option key={example.id} value={example.id}>
                  {example.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-grid">
            <div className="field">
              <FieldLabel htmlFor="sourceName" label="Source name" />
              <input
                id="sourceName"
                name="sourceName"
                autoComplete="organization"
                value={sourceName}
                onChange={(event) => setSourceName(event.target.value)}
              />
            </div>
            <div className="field">
              <FieldLabel htmlFor="externalId" label="External ID" />
              <input
                id="externalId"
                name="externalId"
                autoComplete="off"
                value={externalId}
                onChange={(event) => setExternalId(event.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <FieldLabel htmlFor="webhookSourceType" label="Source type" />
            <select
              id="webhookSourceType"
              name="webhookSourceType"
              value={webhookSourceType}
              onChange={(event) =>
                setWebhookSourceType(event.target.value as SourceType)
              }
            >
              {sourceOptions.map((option) => (
                <option key={option} value={option}>
                  {formatOption(option)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <FieldLabel htmlFor="webhookTask" label="Trusted task" />
            <textarea
              id="webhookTask"
              name="webhookTask"
              autoComplete="off"
              value={webhookTask}
              onChange={(event) => setWebhookTask(event.target.value)}
            />
          </div>
          <div className="field">
            <FieldLabel htmlFor="webhookContent" label="Untrusted content" />
            <textarea
              className="content-input compact-content"
              id="webhookContent"
              name="webhookContent"
              autoComplete="off"
              value={webhookContent}
              onChange={(event) => setWebhookContent(event.target.value)}
            />
          </div>
          <button
            aria-busy={webhookState.loading}
            className="button primary-button"
            type="submit"
            disabled={webhookState.loading}
          >
            {webhookState.loading ? "Sending webhook test..." : "Send webhook test"}
          </button>
            <ResultSummary state={webhookState} />
          </form>
        ) : null}

        {activeMethod === "url" ? (
          <form className="source-form source-form-narrow" onSubmit={submitUrl}>
            <div className="panel-heading compact">
              <div>
                <p className="panel-kicker">URL fetch</p>
                <h2>Fetch and check</h2>
              </div>
            </div>
            <p className="source-card-copy">
              Localhost and private-network URLs are blocked.
            </p>
          <div className="field">
            <FieldLabel htmlFor="url" label="URL" />
            <input
              id="url"
              name="url"
              type="url"
              autoComplete="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com..."
            />
          </div>
          <div className="field">
            <FieldLabel htmlFor="urlTask" label="Trusted task" />
            <textarea
              id="urlTask"
              name="urlTask"
              autoComplete="off"
              value={urlTask}
              onChange={(event) => setUrlTask(event.target.value)}
            />
          </div>
          <button
            aria-busy={urlState.loading}
            className="button primary-button"
            type="submit"
            disabled={urlState.loading}
          >
            {urlState.loading ? "Fetching URL..." : "Fetch and check"}
          </button>
            <ResultSummary state={urlState} />
          </form>
        ) : null}

        {activeMethod === "file" ? (
          <form className="source-form source-form-narrow" onSubmit={submitFile}>
            <div className="panel-heading compact">
              <div>
                <p className="panel-kicker">File upload</p>
                <h2>Text-like files</h2>
              </div>
            </div>
            <p className="source-card-copy">
              Allowed: .txt, .md, .html, .htm, .json, .csv, and .log up to 1 MB.
            </p>
          <div className="field">
            <FieldLabel htmlFor="fileTask" label="Trusted task" />
            <textarea
              id="fileTask"
              name="fileTask"
              autoComplete="off"
              value={fileTask}
              onChange={(event) => setFileTask(event.target.value)}
            />
          </div>
          <div className="field">
            <FieldLabel htmlFor="file" label="File" />
            <input
              id="file"
              name="file"
              type="file"
              accept=".txt,.md,.html,.htm,.json,.csv,.log,text/*,application/json"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <button
            aria-busy={fileState.loading}
            className="button primary-button"
            type="submit"
            disabled={fileState.loading}
          >
            {fileState.loading ? "Uploading file..." : "Upload and check"}
          </button>
            <ResultSummary state={fileState} />
          </form>
        ) : null}
      </article>
    </section>
  );
}
