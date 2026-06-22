import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";
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

function formatVerdict(verdict: string) {
  if (verdict === "ALLOW") {
    return "allowed";
  }

  if (verdict === "SANITIZE") {
    return "sanitized";
  }

  if (verdict === "BLOCK") {
    return "blocked";
  }

  return "error";
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
        <Link className="run-row" href={`/runs/${run.id}`} key={run.id}>
          <div className="run-row-main">
            <span className="run-row-title">
              {snippet(run.userTask, 120)}
            </span>
            <div className="run-row-meta">
              <span>{formatDate(run.createdAt)}</span>
              <span>{metadataString(run.metadata, "ingestion_method")}</span>
              <span>{run.sourceType.replaceAll("_", " ")}</span>
            </div>
          </div>
          <div className="run-row-status">
            <span className={`risk-label ${run.riskLevel}`}>
              {run.riskLevel}
            </span>
            <span className="run-verdict">{formatVerdict(run.verdict)}</span>
          </div>
        </Link>
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
            Review previous decisions, extracted injections, and sanitized
            content returned by the scanner.
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
