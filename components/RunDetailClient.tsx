"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CodeBlock } from "@/components/CodeBlock";
import { PageHeader } from "@/components/PageHeader";
import { useAuthSession } from "@/components/useAuthSession";
import type { RiskLevel, SourceType, Verdict } from "@/lib/guardrail/types";

type GuardrailRunDetail = {
  id: string;
  createdAt: string;
  sourceType: SourceType;
  userTask: string;
  originalContent: string;
  sanitizedContent: string;
  extractedInjection: string | null;
  containsInjection: boolean;
  removed: boolean;
  verdict: Verdict;
  riskLevel: RiskLevel;
  riskScore: number;
  provider: string | null;
  modelUsed: string | null;
  reason: string | null;
  categories: string[];
  warnings: string[];
  metadata: Record<string, unknown>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "long"
  }).format(new Date(value));
}

function metadataString(
  metadata: Record<string, unknown>,
  field: string,
  fallback = "direct api"
) {
  const value = metadata[field];

  return typeof value === "string" && value.trim().length > 0
    ? value.replaceAll("_", " ")
    : fallback;
}

function formatVerdict(verdict: string) {
  return verdict === "ALLOW"
    ? "allowed"
    : verdict === "SANITIZE"
      ? "sanitized"
      : verdict === "BLOCK"
        ? "blocked"
        : "error";
}

function outputCopy(verdict: string) {
  if (verdict === "BLOCK") {
    return {
      title: "Blocked output",
      helper: "This content should not be passed to the agent."
    };
  }

  if (verdict === "ALLOW") {
    return {
      title: "Allowed content",
      helper: "The original content can be passed through."
    };
  }

  return {
    title: "Sanitized content",
    helper: "Use this sanitized version."
  };
}

function whatHappened(verdict: string) {
  if (verdict === "ALLOW") {
    return "No injected instruction was detected. The original content can be passed through.";
  }

  if (verdict === "SANITIZE") {
    return "An injected instruction was removed. Use the sanitized content below.";
  }

  return "An injection was detected, but AgentGate did not produce a safe sanitized version. Do not pass this content to the agent.";
}

export function RunDetailClient({ id }: { id: string }) {
  const {
    error: authError,
    loading: authLoading,
    session
  } = useAuthSession();
  const [run, setRun] = useState<GuardrailRunDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    fetch(`/api/runs/${id}`, {
      headers: {
        "Authorization": `Bearer ${session.access_token}`
      }
    })
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Run is unavailable.");
        }

        setRun(payload.run);
        setError(null);
      })
      .catch((runError) => {
        setError(runError instanceof Error ? runError.message : "Run is unavailable.");
      })
      .finally(() => setLoaded(true));
  }, [id, session]);

  const loading = Boolean(session) && !loaded && !error;

  if (!session && !authLoading) {
    return (
      <main className="page-shell" id="main-content">
        <AppHeader active="runs" />
        <section className="panel history-empty">
          <h1>{authError ? "Auth is not configured." : "Sign in to view this run."}</h1>
          <p>
            {authError ??
              "Saved run details are scoped to the account that created them."}
          </p>
          {authError ? null : (
            <Link className="button primary-button" href="/login">
              Sign in
            </Link>
          )}
        </section>
      </main>
    );
  }

  if (loading || authLoading || !run) {
    return (
      <main className="page-shell" id="main-content">
        <AppHeader active="runs" />
        <section className="panel history-empty">
          <h1>{error ? "Run unavailable." : "Loading run..."}</h1>
          {error ? <p>{error}</p> : null}
          <Link className="button secondary-button" href="/runs">
            Back to runs
          </Link>
        </section>
      </main>
    );
  }

  const output = outputCopy(run.verdict);
  const removedContent =
    run.verdict === "BLOCK" &&
    !run.removed &&
    run.sanitizedContent.startsWith("[BLOCKED:")
      ? "No safe removal span was found. The content was blocked."
      : run.removed && run.extractedInjection
        ? run.extractedInjection
        : run.removed
          ? "Injected instruction removed."
          : "No content removed.";

  return (
    <main className="page-shell" id="main-content">
      <AppHeader active="runs" />

      <PageHeader
        label="Saved run"
        title="Guardrail result"
        action={
          <Link className="button secondary-button" href="/runs">
            Back to runs
          </Link>
        }
      >
        <p>{formatDate(run.createdAt)}</p>
      </PageHeader>

      <section className="run-detail-grid">
        <aside className="panel run-summary-panel">
          <div className="summary-topline">
            <div>
              <p className="panel-kicker">Decision</p>
              <h2>Summary</h2>
            </div>
            <div className="run-row-status">
              <span className={`risk-label ${run.riskLevel}`}>
                {run.riskLevel}
              </span>
              <span className="run-verdict">{formatVerdict(run.verdict)}</span>
            </div>
          </div>

          <p className={`what-happened ${run.verdict.toLowerCase()}`}>
            {whatHappened(run.verdict)}
          </p>

          <dl className="metadata-grid">
            <div>
              <dt>Source</dt>
              <dd>{run.sourceType.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Method</dt>
              <dd>{metadataString(run.metadata, "ingestion_method")}</dd>
            </div>
            <div>
              <dt>Injection</dt>
              <dd>{run.containsInjection ? "Yes" : "No"}</dd>
            </div>
          </dl>
        </aside>

        <article className="panel run-content-panel">
          <section className="result-section">
            <h3>Trusted task</h3>
            <p className="reason">{run.userTask}</p>
          </section>

          <section className="result-section">
            <h3>Reason</h3>
            <p className="reason">{run.reason ?? "No reason stored."}</p>
          </section>

          <section className="result-section">
            <div className="section-title-row">
              <h3>{output.title}</h3>
              <span>{output.helper}</span>
            </div>
            <CodeBlock value={run.sanitizedContent} copyable />
          </section>

          <section className="result-section">
            <h3>Removed content</h3>
            <CodeBlock value={removedContent} copyable />
          </section>

          <section className="result-section">
            <h3>Original content</h3>
            <CodeBlock value={run.originalContent} copyable />
          </section>

          <section className="result-section">
            <h3>Categories</h3>
            <div className="tags">
              {run.categories.length > 0 ? (
                run.categories.map((category) => (
                  <span key={category} className="tag">
                    {category}
                  </span>
                ))
              ) : (
                <span className="tag">none</span>
              )}
            </div>
          </section>

          {run.warnings.length > 0 ? (
            <section className="result-section">
              <h3>Warnings</h3>
              <ul className="warnings">
                {run.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <details className="technical-details">
            <summary>Technical details</summary>
            <dl className="metadata-grid">
              <div>
                <dt>Risk score</dt>
                <dd>{run.riskScore}/100</dd>
              </div>
              <div>
                <dt>Provider</dt>
                <dd>{run.provider ?? "Unknown"}</dd>
              </div>
              <div>
                <dt>Model</dt>
                <dd>{run.modelUsed ?? "Unknown"}</dd>
              </div>
            </dl>
            {Object.keys(run.metadata).length > 0 ? (
              <CodeBlock value={JSON.stringify(run.metadata, null, 2)} copyable />
            ) : null}
          </details>
        </article>
      </section>
    </main>
  );
}
