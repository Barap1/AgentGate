import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CodeBlock } from "@/components/CodeBlock";
import { RiskMeter } from "@/components/RiskMeter";
import { VerdictBadge } from "@/components/VerdictBadge";
import { getGuardrailRun } from "@/lib/db/runs";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "long"
  }).format(new Date(value));
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
      <main className="page-shell">
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

  const removedContent =
    run.removed && run.extractedInjection
      ? run.extractedInjection
      : run.removed
        ? "Content was removed, but no extracted span was stored."
        : "No content removed.";

  return (
    <main className="page-shell">
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

          <dl className="metadata-grid">
            <div>
              <dt>Source</dt>
              <dd>{run.sourceType.replaceAll("_", " ")}</dd>
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

          <section className="result-section">
            <h3>Extracted injection</h3>
            <CodeBlock
              value={run.extractedInjection ?? ""}
              emptyText="No injected instruction detected."
            />
          </section>

          <section className="result-section">
            <div className="section-title-row">
              <h3>Sanitized content</h3>
              <span>Passed to agent</span>
            </div>
            <CodeBlock value={run.sanitizedContent} copyable />
          </section>

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
        </article>
      </section>
    </main>
  );
}
