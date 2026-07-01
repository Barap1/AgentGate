"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";
import { useAuthSession } from "@/components/useAuthSession";
import type { ActionDecision, ActionType } from "@/lib/action-guard/types";
import type { RiskLevel, SourceType, Verdict } from "@/lib/guardrail/types";

type GuardrailRunSummary = {
  id: string;
  createdAt: string;
  sourceType: SourceType;
  userTask: string;
  verdict: Verdict;
  riskLevel: RiskLevel;
  metadata: Record<string, unknown>;
};

type ActionDecisionSummary = {
  id: string;
  createdAt: string;
  agentId: string;
  actionType: ActionType;
  toolName: string;
  target: string;
  decision: ActionDecision;
  riskLevel: RiskLevel;
  riskScore: number;
  reasons: string[];
  matchedPolicies: string[];
  requiresHumanApproval: boolean;
};

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

  if (verdict === "REVIEW") {
    return "review";
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
            <span className="run-row-title">{snippet(run.userTask, 120)}</span>
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

function ActionDecisionsList({
  decisions
}: {
  decisions: ActionDecisionSummary[];
}) {
  if (decisions.length === 0) {
    return (
      <div className="history-empty">
        <h2>No action decisions saved yet.</h2>
        <p>Run an Action Guard check while signed in to save the first decision.</p>
      </div>
    );
  }

  return (
    <div className="runs-list">
      {decisions.map((decision) => {
        const reason = decision.reasons[0] ?? decision.matchedPolicies[0] ?? "No policy matched.";

        return (
          <div className="run-row" key={decision.id}>
            <div className="run-row-main">
              <span className="run-row-title">{snippet(decision.target, 120)}</span>
              <div className="run-row-meta">
                <span>{formatDate(decision.createdAt)}</span>
                <span>{decision.agentId}</span>
                <span>{decision.actionType.replaceAll("_", " ")}</span>
                <span>{decision.toolName}</span>
              </div>
              <div className="run-row-meta">
                <span>{snippet(reason, 120)}</span>
                <span>{decision.requiresHumanApproval ? "approval required" : "no approval required"}</span>
              </div>
            </div>
            <div className="run-row-status">
              <span className={`risk-label ${decision.riskLevel}`}>
                {decision.riskLevel} {decision.riskScore}
              </span>
              <span className="run-verdict">{formatVerdict(decision.decision)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RunsPage() {
  const {
    error: authError,
    loading: authLoading,
    session
  } = useAuthSession();
  const [runs, setRuns] = useState<GuardrailRunSummary[]>([]);
  const [actionDecisions, setActionDecisions] = useState<ActionDecisionSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    fetch("/api/runs?limit=50", {
      headers: {
        "Authorization": `Bearer ${session.access_token}`
      }
    })
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Run history is unavailable.");
        }

        setRuns(payload.runs ?? []);
        setActionDecisions(payload.actionDecisions ?? []);
        setError(null);
      })
      .catch((runError) => {
        setError(
          runError instanceof Error ? runError.message : "Run history is unavailable."
        );
      })
      .finally(() => setLoaded(true));
  }, [session]);

  const loading = Boolean(session) && !loaded && !error;

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
          Review previous decisions, extracted injections, and sanitized content
          returned by the scanner and Action Guard.
        </p>
      </PageHeader>

      <section className="panel history-panel">
        {!authLoading && !session ? (
          <div className="history-empty">
            <h2>{authError ? "Run history is not configured." : "Sign up to save and view runs."}</h2>
            <p>
              {authError ??
                "You can run scans without an account. Saved run history starts after you create one."}
            </p>
            {authError ? null : (
              <Link className="button primary-button" href="/login">
                Sign up
              </Link>
            )}
          </div>
        ) : error ? (
          <div className="history-empty">
            <h2>Run history unavailable.</h2>
            <p>{error}</p>
          </div>
        ) : loading || authLoading ? (
          <div className="history-empty">
            <h2>Loading runs...</h2>
          </div>
        ) : (
          <>
            {runs.length > 0 ? (
              <div className="history-toolbar">
                <strong>Input runs</strong>
                <span>Newest first</span>
              </div>
            ) : null}
            <RunsList runs={runs} />
            {actionDecisions.length > 0 ? (
              <div className="history-toolbar">
                <strong>Action decisions</strong>
                <span>{actionDecisions.length} recent decisions</span>
              </div>
            ) : null}
            <ActionDecisionsList decisions={actionDecisions} />
          </>
        )}
      </section>
    </main>
  );
}
