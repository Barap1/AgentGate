import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";
import { VerdictBadge } from "@/components/VerdictBadge";
import { listGuardrailRuns, type GuardrailRunSummary } from "@/lib/db/runs";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function snippet(value: string, length = 82) {
  return value.length > length ? `${value.slice(0, length).trim()}...` : value;
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

function RunsList({ runs }: { runs: GuardrailRunSummary[] }) {
  if (runs.length === 0) {
    return (
      <div className="history-empty">
        <h2>No guardrail runs saved yet.</h2>
        <p>Run a check from the scanner to create the first saved result.</p>
      </div>
    );
  }

  return (
    <div className="runs-list">
      {runs.map((run) => (
        <article className="run-row" key={run.id}>
          <div className="run-row-main">
            <Link className="table-primary-link" href={`/runs/${run.id}`}>
              {snippet(run.userTask, 120)}
            </Link>
            <div className="run-row-meta">
              <span>{formatDate(run.createdAt)}</span>
              <span>{metadataString(run.metadata, "ingestion_method")}</span>
              <span>{run.sourceType.replaceAll("_", " ")}</span>
              <span>{run.modelUsed ?? "Unknown"}</span>
            </div>
          </div>
          <div className="run-row-status">
            <VerdictBadge verdict={run.verdict} />
            <span className={`risk-label ${run.riskLevel}`}>
              {run.riskLevel} / {run.riskScore}
            </span>
            <span className="injection-label">
              Injection {run.containsInjection ? "yes" : "no"}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

export default async function RunsPage() {
  let runs: GuardrailRunSummary[] = [];
  let error: string | null = null;

  try {
    runs = await listGuardrailRuns(50);
  } catch (runHistoryError) {
    error =
      runHistoryError instanceof Error
        ? runHistoryError.message
        : "Run history is unavailable.";
  }

  return (
    <main className="page-shell" id="main-content">
      <AppHeader active="runs" />

      <PageHeader
        label="Run history"
        title="Saved guardrail checks"
        action={
          <Link className="button secondary-button" href="/">
            New check
          </Link>
        }
      >
          <p>
            Review previous decisions, extracted injections, provider metadata,
            and sanitized content returned by the scanner.
          </p>
      </PageHeader>

      <section className="panel history-panel">
        {!error && runs.length > 0 ? (
          <div className="history-toolbar">
            <strong>{runs.length} recent runs</strong>
            <span>Newest first</span>
          </div>
        ) : null}
        {error ? (
          <div className="history-empty">
            <h2>Run history unavailable.</h2>
            <p>{error}</p>
          </div>
        ) : (
          <RunsList runs={runs} />
        )}
      </section>
    </main>
  );
}
