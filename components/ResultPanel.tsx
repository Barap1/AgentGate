import { CodeBlock } from "@/components/CodeBlock";
import { EmptyState } from "@/components/EmptyState";
import { RiskMeter } from "@/components/RiskMeter";
import { VerdictBadge } from "@/components/VerdictBadge";
import type { SanitizeResult } from "@/lib/guardrail/types";
import Link from "next/link";

type ResultPanelProps = {
  result: SanitizeResult | null;
  error: string | null;
};

function formatBoolean(value: boolean) {
  return value ? "Yes" : "No";
}

function outputCopy(result: SanitizeResult) {
  if (result.verdict === "BLOCK") {
    return {
      title: "Blocked output",
      helper: "This content should not be passed to the agent."
    };
  }

  if (result.verdict === "ALLOW") {
    return {
      title: "Allowed content",
      helper: "This is the content that would be passed to the agent."
    };
  }

  return {
    title: "Sanitized content",
    helper: "This is the content that would be passed to the agent."
  };
}

function blockedDueToFailedRemoval(result: SanitizeResult) {
  return (
    result.verdict === "BLOCK" &&
    !result.removed &&
    result.sanitizedContent.startsWith("[BLOCKED:")
  );
}

export function ResultPanel({ result, error }: ResultPanelProps) {
  if (error) {
    return (
      <aside className="panel result-panel" aria-live="polite">
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
      <aside className="panel result-panel" aria-live="polite">
        <EmptyState
          title="Run a check to see the guardrail decision."
          body="The result will show the verdict, extracted injection, sanitized content, provider metadata, and categories."
        />
      </aside>
    );
  }

  const output = outputCopy(result);
  const removedContent = blockedDueToFailedRemoval(result)
    ? "No safe removal span was found. The content was blocked."
    : result.removed && result.extractedInjection
      ? result.extractedInjection
      : result.removed
        ? "Injected instruction removed."
        : "No content removed.";

  return (
    <aside className="panel result-panel" aria-live="polite">
      <section className="decision-summary" aria-labelledby="decision-title">
        <div className="summary-topline">
          <div>
            <p className="panel-kicker">Guardrail decision</p>
            <h2 id="decision-title">Review result</h2>
          </div>
          <VerdictBadge verdict={result.verdict} />
        </div>

        <RiskMeter score={result.riskScore} level={result.riskLevel} />

        <dl className="metadata-grid">
          <div>
            <dt>Risk level</dt>
            <dd>{result.riskLevel}</dd>
          </div>
          <div>
            <dt>Contains injection</dt>
            <dd>{formatBoolean(result.containsInjection)}</dd>
          </div>
          <div>
            <dt>Provider</dt>
            <dd>{result.provider}</dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{result.modelUsed}</dd>
          </div>
        </dl>

        {result.persisted && result.runId ? (
          <div className="saved-run-callout">
            <span>Saved run</span>
            <Link href={`/runs/${result.runId}`}>Open saved result</Link>
          </div>
        ) : result.persisted === false ? (
          <div className="saved-run-callout muted">
            <span>Run not saved</span>
            <p>Configure Supabase to enable history.</p>
          </div>
        ) : null}
      </section>

      <section className="result-section">
        <h3>Reason</h3>
        <p className="reason">{result.reason}</p>
        {result.warnings.length > 0 ? (
          <ul className="warnings" aria-label="Warnings">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="result-section">
        <h3>Extracted injection</h3>
        <CodeBlock
          value={result.extractedInjection ?? ""}
          emptyText="No injected instruction detected."
        />
      </section>

      <section className="result-section">
        <div className="section-title-row">
          <h3>{output.title}</h3>
          <span>{output.helper}</span>
        </div>
        <CodeBlock value={result.sanitizedContent} copyable />
      </section>

      <section className="result-section">
        <h3>Removed content</h3>
        <CodeBlock value={removedContent} />
      </section>

      <details className="original-details">
        <summary>Original content</summary>
        <CodeBlock value={result.originalContent} />
      </details>

      <section className="result-section">
        <h3>Categories</h3>
        <div className="tags">
          {result.categories.length > 0 ? (
            result.categories.map((category) => (
              <span key={category} className="tag">
                {category}
              </span>
            ))
          ) : (
            <span className="tag">none</span>
          )}
        </div>
      </section>
    </aside>
  );
}
