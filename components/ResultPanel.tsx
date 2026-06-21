import { CodeBlock } from "@/components/CodeBlock";
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
      helper: "Do not use this content."
    };
  }

  if (result.verdict === "ALLOW") {
    return {
      title: "Allowed content",
      helper: "The original content is safe to use."
    };
  }

  return {
    title: "Sanitized content",
    helper: "Use this sanitized version."
  };
}

function whatHappened(result: SanitizeResult) {
  if (result.verdict === "ALLOW") {
    return "No injected instruction was detected. The original content can be passed through.";
  }

  if (result.verdict === "SANITIZE") {
    return "An injected instruction was removed. Use the sanitized content below.";
  }

  return "An injection was detected, but AgentGate did not produce a safe sanitized version. Do not pass this content to the agent.";
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
          <p>Check provider configuration, reduce input size, or retry the request.</p>
        </div>
      </aside>
    );
  }

  if (!result) {
    return (
      <aside className="panel result-panel" aria-live="polite">
        <div className="empty-state">
          <div className="empty-state-rule" aria-hidden="true" />
          <h2>Run a check to see the guardrail decision.</h2>
          <p>
            The result will show the verdict, extracted injection, sanitized
            content, provider metadata, and categories.
          </p>
        </div>
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
      <section
        className={`decision-summary ${result.verdict.toLowerCase()}`}
        aria-labelledby="decision-title"
      >
        <div className="summary-topline">
          <div>
            <p className="panel-kicker">Guardrail decision</p>
            <h2 id="decision-title">{output.title}</h2>
          </div>
          <VerdictBadge verdict={result.verdict} />
        </div>

        <RiskMeter score={result.riskScore} level={result.riskLevel} />

        <p className={`what-happened ${result.verdict.toLowerCase()}`}>
          {whatHappened(result)}
        </p>

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

      <div className="result-compare">
        <section className="result-section">
          <h3>Extracted injection</h3>
          <CodeBlock
            value={result.extractedInjection ?? ""}
            emptyText="No injected instruction detected."
            copyable
          />
        </section>

        <section className="result-section">
          <div className="section-title-row">
            <h3>{output.title}</h3>
            <span>{output.helper}</span>
          </div>
          <CodeBlock value={result.sanitizedContent} copyable />
        </section>
      </div>

      <section className="result-section">
        <h3>Removed content</h3>
        <CodeBlock value={removedContent} copyable />
      </section>

      <details className="original-details">
        <summary>Original content</summary>
        <CodeBlock value={result.originalContent} copyable />
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
