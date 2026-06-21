"use client";

import { FormEvent, useState } from "react";
import { ResultPanel } from "@/components/ResultPanel";
import { FieldLabel } from "@/components/FieldLabel";
import {
  defaultDemoExample,
  demoExamples,
  type DemoExample
} from "@/lib/demoExamples";
import type {
  PromptStrategy,
  SanitizeResult,
  SourceType
} from "@/lib/guardrail/types";

const SOURCE_OPTIONS: SourceType[] = [
  "support_ticket",
  "email",
  "slack_message",
  "webpage",
  "document",
  "tool_output",
  "manual_test"
];

const STRATEGY_OPTIONS: PromptStrategy[] = [
  "definition_enhanced",
  "basic",
  "strict_extraction"
];

type ApiError = {
  error?: string;
  details?: string;
};

type FieldErrors = {
  userTask?: string;
  content?: string;
};

type SanitizeFormProps = {
  maxInputChars: number;
};

function formatOption(option: string) {
  return option.replaceAll("_", " ");
}

export function SanitizeForm({ maxInputChars }: SanitizeFormProps) {
  const [selectedDemoId, setSelectedDemoId] = useState(defaultDemoExample.id);
  const [userTask, setUserTask] = useState(defaultDemoExample.userTask);
  const [sourceType, setSourceType] = useState<SourceType>(
    defaultDemoExample.sourceType
  );
  const [content, setContent] = useState(defaultDemoExample.content);
  const [promptStrategy, setPromptStrategy] =
    useState<PromptStrategy>("definition_enhanced");
  const [result, setResult] = useState<SanitizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function validateFields() {
    const nextErrors: FieldErrors = {};

    if (!userTask.trim()) {
      nextErrors.userTask = "Enter the trusted task.";
    }

    if (!content.trim()) {
      nextErrors.content = "Enter untrusted content to inspect.";
    } else if (content.length > maxInputChars) {
      nextErrors.content = `Content is over the ${maxInputChars.toLocaleString()} character limit.`;
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function loadExample(example: DemoExample) {
    setSelectedDemoId(example.id);
    setUserTask(example.userTask);
    setSourceType(example.sourceType);
    setContent(example.content);
    setPromptStrategy("definition_enhanced");
    setResult(null);
    setError(null);
    setFieldErrors({});
  }

  function handleDemoChange(demoId: string) {
    const example = demoExamples.find((demoExample) => demoExample.id === demoId);

    if (example) {
      loadExample(example);
    }
  }

  function clearForm() {
    setUserTask("");
    setContent("");
    setSourceType("manual_test");
    setPromptStrategy("definition_enhanced");
    setResult(null);
    setError(null);
    setFieldErrors({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || !validateFields()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sanitize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userTask,
          sourceType,
          content,
          promptStrategy
        })
      });

      const payload = (await response.json()) as SanitizeResult | ApiError;

      if (!response.ok) {
        const apiError = payload as ApiError;
        throw new Error(apiError.error ?? "Sanitization request failed.");
      }

      setResult(payload as SanitizeResult);
    } catch (requestError) {
      setResult(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Sanitization request failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className="workspace"
      id="scanner-workspace"
      aria-label="AgentGate scanner workspace"
    >
      <form className="panel input-panel" onSubmit={handleSubmit} noValidate>
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">Input</p>
            <h2>Scan content</h2>
          </div>
          <p className="privacy-note">
            Do not submit secrets, credentials, or sensitive customer content.
          </p>
        </div>

        <div className="demo-loader">
          <div>
            <strong>Load demo</strong>
            <p>Start with a malicious or benign sample.</p>
          </div>
          <select
            aria-label="Load demo example"
            value={selectedDemoId}
            onChange={(event) => handleDemoChange(event.target.value)}
            disabled={loading}
          >
            {demoExamples.map((example) => (
              <option key={example.id} value={example.id}>
                {example.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <FieldLabel
            htmlFor="userTask"
            label="Trusted task"
            helper="What the agent is supposed to do."
          />
          <textarea
            id="userTask"
            name="userTask"
            autoComplete="off"
            value={userTask}
            maxLength={2000}
            onChange={(event) => {
              setUserTask(event.target.value);
              setFieldErrors((current) => ({ ...current, userTask: undefined }));
            }}
            placeholder="Summarize this support ticket..."
            aria-invalid={Boolean(fieldErrors.userTask)}
            aria-describedby={fieldErrors.userTask ? "userTask-error" : undefined}
          />
          <div className="field-meta">
            {fieldErrors.userTask ? (
              <span id="userTask-error" className="field-error">
                {fieldErrors.userTask}
              </span>
            ) : (
              <span>{userTask.length}/2,000</span>
            )}
          </div>
        </div>

        <div className="field-grid">
          <div className="field">
            <FieldLabel htmlFor="sourceType" label="Source type" />
            <select
              id="sourceType"
              name="sourceType"
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value as SourceType)}
            >
              {SOURCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatOption(option)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <FieldLabel htmlFor="promptStrategy" label="Prompt strategy" />
            <select
              id="promptStrategy"
              name="promptStrategy"
              value={promptStrategy}
              onChange={(event) =>
                setPromptStrategy(event.target.value as PromptStrategy)
              }
            >
              {STRATEGY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatOption(option)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <FieldLabel
            htmlFor="content"
            label="Untrusted content"
            helper="Ticket, email, webpage, document, or tool output."
          />
          <textarea
            className="content-input"
            id="content"
            name="content"
            autoComplete="off"
            value={content}
            maxLength={maxInputChars + 1}
            onChange={(event) => {
              setContent(event.target.value);
              setFieldErrors((current) => ({ ...current, content: undefined }));
            }}
            placeholder="Paste untrusted content here..."
            aria-invalid={Boolean(fieldErrors.content)}
            aria-describedby={fieldErrors.content ? "content-error" : undefined}
          />
          <div className="field-meta">
            {fieldErrors.content ? (
              <span id="content-error" className="field-error">
                {fieldErrors.content}
              </span>
            ) : (
              <span>
                {content.length.toLocaleString()} /{" "}
                {maxInputChars.toLocaleString()} characters
              </span>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button
            aria-busy={loading}
            className="button primary-button"
            type="submit"
            disabled={loading}
          >
          {loading ? "Checking untrusted content..." : "Run guardrail check"}
          </button>
          <button
            className="button quiet-button"
            type="button"
            onClick={clearForm}
            disabled={loading}
          >
            Clear
          </button>
        </div>

        <p className="technical-note">
          Provider calls run server-side. API keys stay in `.env.local`.
        </p>
        {loading ? (
          <div className="loading-state" role="status">
            <span />
            Checking content. This can take a few seconds.
          </div>
        ) : null}
      </form>

      <ResultPanel result={result} error={error} />
    </section>
  );
}
