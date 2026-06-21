import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CodeBlock } from "@/components/CodeBlock";
import { RiskMeter } from "@/components/RiskMeter";
import { VerdictBadge } from "@/components/VerdictBadge";
import { getGuardrailRun } from "@/lib/db/runs";

export const dynamic = "force-dynamic";

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

async function loadRun(id: string) {
  try {
    return {
      run: await getGuardrailRun(id),
      error: null
    };
  } catch (runError) {
    return {
      run: null,
      error:
        runError instanceof Error
          ? runError.message
          : "Run history is unavailable."
    };
  }
}

export default async function RunDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { run, error } = await loadRun(id);

  if (!run && !error) {
    notFound();
  }

  if (!run) {
    return (
      <main className="page-shell" id="main-content">
        <AppHeader active="runs" />
        <section className="panel history-empty">
          <h1>Run history unavailable.</h1>
          <p>{error}</p>
          <Link className="button secondary-button" href="/runs">
            Back to runs
          </Link>
        </section>
      </main>
    );
  }

  const output = outputCopy(run.verdict);
  const blockedDueToFailedRemoval =
    run.verdict === "BLOCK" &&
    !run.removed &&
    run.sanitizedContent.startsWith("[BLOCKED:");
  const removedContent = blockedDueToFailedRemoval
    ? "No safe removal span was found. The content was blocked."
    : run.removed && run.extractedInjection
      ? run.extractedInjection
      : run.removed
        ? "Injected instruction removed."
        : "No content removed.";

  return (
    <main className="page-shell" id="main-content">
      <AppHeader active="runs" />

      <section className="run-detail-header">
        <div>
          <p className="section-kicker">Saved run</p>
          <h1>Guardrail result</h1>
          <p>{formatDate(run.createdAt)}</p>
        </div>
        <Link className="button secondary-button" href="/runs">
          Back to runs
        </Link>
      </section>

      <section className="run-detail-grid">
        <aside className="panel run-summary-panel">
          <div className="summary-topline">
            <div>
              <p className="panel-kicker">Decision</p>
              <h2>Summary</h2>
            </div>
            <VerdictBadge verdict={run.verdict} />
          </div>

          <RiskMeter score={run.riskScore} level={run.riskLevel} />

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
            <div>
              <dt>Provider</dt>
              <dd>{run.provider ?? "Unknown"}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{run.modelUsed ?? "Unknown"}</dd>
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

          <div className="result-compare">
            <section className="result-section">
              <h3>Extracted injection</h3>
              <CodeBlock
                value={run.extractedInjection ?? ""}
                emptyText="No injected instruction detected."
              />
            </section>

            <section className="result-section">
              <div className="section-title-row">
                <h3>{output.title}</h3>
                <span>{output.helper}</span>
              </div>
              <CodeBlock value={run.sanitizedContent} copyable />
            </section>
          </div>

          <section className="result-section">
            <h3>Removed content</h3>
            <CodeBlock value={removedContent} />
          </section>

          <section className="result-section">
            <h3>Original content</h3>
            <CodeBlock value={run.originalContent} />
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

          {Object.keys(run.metadata).length > 0 ? (
            <section className="result-section">
              <h3>Metadata</h3>
              <CodeBlock value={JSON.stringify(run.metadata, null, 2)} copyable />
            </section>
          ) : null}
        </article>
      </section>
    </main>
  );
}
