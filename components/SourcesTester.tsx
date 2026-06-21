"use client";

import { FormEvent, useMemo, useState } from "react";
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

  const webhookDisabled = useMemo(
    () => webhookState.loading || webhookContent.trim().length === 0,
    [webhookContent, webhookState.loading]
  );
  const urlDisabled = useMemo(
    () => urlState.loading || url.trim().length === 0,
    [url, urlState.loading]
  );
  const fileDisabled = useMemo(
    () => fileState.loading || !file,
    [file, fileState.loading]
  );

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
    <section className="sources-grid" aria-label="Ingestion methods">
      <article className="panel source-card source-card-compact">
        <div className="panel-heading compact">
          <div>
            <p className="panel-kicker">Direct API</p>
            <h2>POST /api/sanitize</h2>
          </div>
        </div>
        <p className="source-card-copy">
          Send trusted task, source type, and untrusted content directly to the
          existing scanner endpoint.
        </p>
        <Link className="button secondary-button" href="/docs#sanitize">
          Open API docs
        </Link>
      </article>

      <article className="panel source-card">
        <div className="panel-heading compact">
          <div>
            <p className="panel-kicker">Webhook</p>
            <h2>External system POST</h2>
          </div>
        </div>
        <form className="source-form" onSubmit={submitWebhook}>
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
                value={sourceName}
                onChange={(event) => setSourceName(event.target.value)}
              />
            </div>
            <div className="field">
              <FieldLabel htmlFor="externalId" label="External ID" />
              <input
                id="externalId"
                value={externalId}
                onChange={(event) => setExternalId(event.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <FieldLabel htmlFor="webhookSourceType" label="Source type" />
            <select
              id="webhookSourceType"
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
              value={webhookTask}
              onChange={(event) => setWebhookTask(event.target.value)}
            />
          </div>
          <div className="field">
            <FieldLabel htmlFor="webhookContent" label="Untrusted content" />
            <textarea
              className="content-input compact-content"
              id="webhookContent"
              value={webhookContent}
              onChange={(event) => setWebhookContent(event.target.value)}
            />
          </div>
          <button
            aria-busy={webhookState.loading}
            className="button primary-button"
            type="submit"
            disabled={webhookDisabled}
          >
            {webhookState.loading ? "Sending webhook test..." : "Send webhook test"}
          </button>
        </form>
        <ResultSummary state={webhookState} />
      </article>

      <article className="panel source-card">
        <div className="panel-heading compact">
          <div>
            <p className="panel-kicker">URL fetch</p>
            <h2>Fetch and check</h2>
          </div>
        </div>
        <p className="source-card-copy">
          Localhost and private-network URLs are blocked.
        </p>
        <form className="source-form" onSubmit={submitUrl}>
          <div className="field">
            <FieldLabel htmlFor="url" label="URL" />
            <input
              id="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="field">
            <FieldLabel htmlFor="urlTask" label="Trusted task" />
            <textarea
              id="urlTask"
              value={urlTask}
              onChange={(event) => setUrlTask(event.target.value)}
            />
          </div>
          <button
            aria-busy={urlState.loading}
            className="button primary-button"
            type="submit"
            disabled={urlDisabled}
          >
            {urlState.loading ? "Fetching URL..." : "Fetch and check"}
          </button>
        </form>
        <ResultSummary state={urlState} />
      </article>

      <article className="panel source-card">
        <div className="panel-heading compact">
          <div>
            <p className="panel-kicker">File upload</p>
            <h2>Text-like files</h2>
          </div>
        </div>
        <p className="source-card-copy">
          Allowed: .txt, .md, .html, .htm, .json, .csv, and .log up to 1 MB.
        </p>
        <form className="source-form" onSubmit={submitFile}>
          <div className="field">
            <FieldLabel htmlFor="fileTask" label="Trusted task" />
            <textarea
              id="fileTask"
              value={fileTask}
              onChange={(event) => setFileTask(event.target.value)}
            />
          </div>
          <div className="field">
            <FieldLabel htmlFor="file" label="File" />
            <input
              id="file"
              type="file"
              accept=".txt,.md,.html,.htm,.json,.csv,.log,text/*,application/json"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <button
            aria-busy={fileState.loading}
            className="button primary-button"
            type="submit"
            disabled={fileDisabled}
          >
            {fileState.loading ? "Uploading file..." : "Upload and check"}
          </button>
        </form>
        <ResultSummary state={fileState} />
      </article>
    </section>
  );
}
