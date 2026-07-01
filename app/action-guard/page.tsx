import { ActionGuardForm } from "@/components/ActionGuardForm";
import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";
import { getMaxInputChars } from "@/lib/utils/validation";

export default function ActionGuardPage() {
  return (
    <main className="page-shell" id="main-content">
      <AppHeader active="action-guard" />

      <section className="scanner-intro" aria-labelledby="action-guard-title">
        <div className="scanner-hero">
          <PageHeader
            label="Action Guard"
            titleId="action-guard-title"
            title="Guard risky tool calls before your agent executes them."
            action={
              <div className="hero-actions">
                <a className="button primary-button" href="#action-guard-workspace">
                  Check an action
                </a>
                <a className="button secondary-button" href="/docs#action-guard">
                  API docs
                </a>
              </div>
            }
          >
            <p>
              Submit a proposed tool call with prior input context. AgentGate
              returns allow, review, or block using deterministic policy logic.
            </p>
          </PageHeader>

          <div className="hero-flow" aria-label="Action Guard workflow">
            <div>
              <span>01</span>
              <strong>Proposed action</strong>
              <p>Email, HTTP, file, database, or shell tool call.</p>
            </div>
            <div>
              <span>02</span>
              <strong>Policy check</strong>
              <p>Detect secrets, PII, external targets, and destructive behavior.</p>
            </div>
            <div>
              <span>03</span>
              <strong>Execution gate</strong>
              <p>Allow, review, or block before the tool executes.</p>
            </div>
          </div>
        </div>
      </section>

      <ActionGuardForm maxInputChars={getMaxInputChars()} />
    </main>
  );
}
