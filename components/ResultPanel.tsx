import { CircleAlert, FileSearch, ShieldCheck } from "lucide-react";
import type { SanitizeResult } from "@/lib/guardrail/types";

type ResultPanelProps = {
  result: SanitizeResult | null;
  error: string | null;
};

function classFor(value: string) {
  return value.toLowerCase();
}

export function ResultPanel({ result, error }: ResultPanelProps) {
  if (error) {
    return (
      <aside className="panel result-panel" aria-live="polite">
        <div className="error-box">
          <strong>Request failed</strong>
          <br />
          {error}
        </div>
      </aside>
    );
  }

  if (!result) {
    return (
      <aside className="panel result-panel" aria-live="polite">
        <div className="empty-state">
          <div>
            <FileSearch size={36} aria-hidden="true" />
            <h2>No guardrail result yet</h2>
            <p>
              Submit the sample input to see verdict, risk, extracted injection,
              sanitized content, model metadata, and warnings.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="panel result-panel" aria-live="polite">
      <div className="result-header">
        <div className="result-title">
          {result.verdict === "ALLOW" ? (
            <ShieldCheck size={26} aria-hidden="true" />
          ) : (
            <CircleAlert size={26} aria-hidden="true" />
          )}
          <div>
            <h2>Guardrail result</h2>
            <p>
              {result.provider} / {result.modelUsed}
            </p>
          </div>
        </div>
        <span className={`pill ${classFor(result.verdict)}`}>
          {result.verdict}
        </span>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <span>Risk</span>
          <strong>
            {result.riskScore}/100{" "}
            <span className={`pill ${classFor(result.riskLevel)}`}>
              {result.riskLevel}
            </span>
          </strong>
        </div>
        <div className="stat">
          <span>Injection</span>
          <strong>{result.containsInjection ? "Detected" : "No"}</strong>
        </div>
        <div className="stat">
          <span>Removed</span>
          <strong>{result.removed ? "Yes" : "No"}</strong>
        </div>
      </div>

      <div className="result-section">
        <h3>Extracted injected prompt</h3>
        <pre className="content-box">
          {result.extractedInjection ?? "None reported"}
        </pre>
      </div>

      <div className="result-section">
        <h3>Sanitized content</h3>
        <pre className="content-box">{result.sanitizedContent}</pre>
      </div>

      <div className="result-section">
        <h3>Reason</h3>
        <p className="reason">{result.reason}</p>
      </div>

      <div className="result-section">
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
      </div>

      {result.warnings.length > 0 && (
        <div className="result-section">
          <h3>Warnings</h3>
          <ul className="warnings">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
