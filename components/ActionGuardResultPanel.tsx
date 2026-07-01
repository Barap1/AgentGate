import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { RiskMeter } from "@/components/RiskMeter";
import { Badge } from "@/components/ui/badge";
import type { ActionDecision, ActionGuardResult } from "@/lib/action-guard/types";

type ActionGuardResultPanelProps = {
  result: ActionGuardResult | null;
  error: string | null;
  signedIn?: boolean;
  loading?: boolean;
};

function decisionCopy(decision: ActionDecision) {
  if (decision === "ALLOW") {
    return {
      title: "Action allowed",
      helper: "The action can proceed."
    };
  }

  if (decision === "REVIEW") {
    return {
      title: "Human review required",
      helper: "Pause execution until approved."
    };
  }

  if (decision === "BLOCK") {
    return {
      title: "Action blocked",
      helper: "Do not execute this tool call."
    };
  }

  return {
    title: "Action check failed",
    helper: "Retry after fixing the request."
  };
}

export function ActionGuardResultPanel({
  result,
  error,
  signedIn = false,
  loading = false
}: ActionGuardResultPanelProps) {
  if (loading) {
    return (
      <aside className="panel result-panel result-card" aria-live="polite">
        <div className="check-progress" role="status">
          <div>
            <p className="panel-kicker">Action Guard</p>
            <h2>Checking proposed action</h2>
            <p>Evaluating target, payload, prior input risk, and hard-block policies.</p>
          </div>
          <div className="progress-line" aria-hidden="true">
            <span />
          </div>
          <ol className="progress-steps">
            <li>Validating action</li>
            <li>Detecting sensitive signals</li>
            <li>Applying deterministic policies</li>
            <li>Returning execution decision</li>
          </ol>
        </div>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="panel result-panel result-card" aria-live="polite">
        <div className="panel-heading compact">
          <div>
            <p className="panel-kicker">Result</p>
            <h2>Request failed</h2>
          </div>
        </div>
        <div className="error-box">
          <strong>What happened</strong>
          <p>{error}</p>
        </div>
      </aside>
    );
  }

  if (!result) {
    return (
      <aside className="panel result-panel result-card" aria-live="polite">
        <div className="empty-state">
          <h2>Run a check to see the action decision.</h2>
          <p>
            The result will show the decision, matched policies, detected
            signals, safe alternative, and raw JSON response.
          </p>
        </div>
      </aside>
    );
  }

  const copy = decisionCopy(result.decision);

  return (
    <aside className="panel result-panel result-card" aria-live="polite">
      <section
        className={`decision-summary ${result.decision.toLowerCase()}`}
        aria-labelledby="action-decision-title"
      >
        <div className="summary-topline">
          <div>
            <p className="panel-kicker">Action decision</p>
            <h2 id="action-decision-title">{copy.title}</h2>
          </div>
          <Badge className={`verdict-badge ${result.decision.toLowerCase()}`} variant="outline">
            {result.decision}
          </Badge>
        </div>

        <RiskMeter score={result.riskScore} level={result.riskLevel} />

        <p className={`what-happened ${result.decision.toLowerCase()}`}>
          {copy.helper}
        </p>

        {result.persisted && result.actionDecisionId ? (
          <div className="saved-run-callout">
            <span>Saved decision</span>
            <span>{result.actionDecisionId}</span>
          </div>
        ) : result.persisted === false ? (
          <div className="saved-run-callout muted">
            <span>{signedIn ? "Decision not saved" : "Save future decisions"}</span>
            <p>
              {signedIn
                ? "Action history is unavailable. Check Supabase configuration."
                : "Create an account to save action decisions and review them later."}
            </p>
            {signedIn ? null : (
              <Link className="button secondary-button" href="/login">
                Sign up to save decisions
              </Link>
            )}
          </div>
        ) : null}
      </section>

      <section className="result-section">
        <h3>Reasons</h3>
        <ul className="warnings">
          {result.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </section>

      <section className="result-section">
        <h3>Safe alternative</h3>
        <p className="reason">{result.safeAlternative}</p>
      </section>

      <section className="result-section">
        <h3>Matched policies</h3>
        <div className="tags">
          {result.matchedPolicies.length > 0 ? (
            result.matchedPolicies.map((policy) => (
              <span className="tag" key={policy}>
                {policy}
              </span>
            ))
          ) : (
            <span className="tag">none</span>
          )}
        </div>
      </section>

      <section className="result-section">
        <h3>Detected signals</h3>
        <div className="tags">
          {result.detectedSignals.length > 0 ? (
            result.detectedSignals.map((signal) => (
              <span className="tag" key={signal}>
                {signal}
              </span>
            ))
          ) : (
            <span className="tag">none</span>
          )}
        </div>
      </section>

      <details className="technical-details">
        <summary>JSON response</summary>
        <CodeBlock value={JSON.stringify(result, null, 2)} copyable />
      </details>
    </aside>
  );
}
