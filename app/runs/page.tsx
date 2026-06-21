import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { VerdictBadge } from "@/components/VerdictBadge";
import { listGuardrailRuns, type GuardrailRunSummary } from "@/lib/db/runs";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
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

function RunsTable({ runs }: { runs: GuardrailRunSummary[] }) {
  if (runs.length === 0) {
    return (
      <div className="history-empty">
        <h2>No guardrail runs saved yet.</h2>
        <p>Run a check from the scanner to create the first saved result.</p>
      </div>
    );
  }

  return (
    <div className="runs-table-wrap">
      <table className="runs-table">
        <thead>
          <tr>
            <th>Created</th>
            <th>Decision</th>
            <th>Risk</th>
            <th>Method</th>
            <th>Source</th>
            <th>Trusted task</th>
            <th>Injection</th>
            <th>Model</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td>
                <Link className="table-primary-link" href={`/runs/${run.id}`}>
                  {formatDate(run.createdAt)}
                </Link>
              </td>
              <td>
                <VerdictBadge verdict={run.verdict} />
              </td>
              <td>
                <span className={`risk-label ${run.riskLevel}`}>
                  {run.riskLevel} / {run.riskScore}
                </span>
              </td>
              <td>{metadataString(run.metadata, "ingestion_method")}</td>
              <td>{run.sourceType.replaceAll("_", " ")}</td>
              <td>{snippet(run.userTask)}</td>
              <td>{run.containsInjection ? "Yes" : "No"}</td>
              <td>{run.modelUsed ?? "Unknown"}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
    <main className="page-shell">
      <AppHeader active="runs" />

      <section className="history-header">
        <div>
          <p className="section-kicker">Run history</p>
          <h1>Saved guardrail checks</h1>
          <p>
            Review previous decisions, extracted injections, provider metadata,
            and sanitized content returned by the scanner.
          </p>
        </div>
        <Link className="button secondary-button" href="/">
          New check
        </Link>
      </section>

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
          <RunsTable runs={runs} />
        )}
      </section>
    </main>
  );
}
