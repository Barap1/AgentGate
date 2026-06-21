import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";
import { SanitizeForm } from "@/components/SanitizeForm";
import { getMaxInputChars } from "@/lib/utils/validation";

export default function Home() {
  return (
    <main className="page-shell" id="main-content">
      <AppHeader active="home" />

      <section className="scanner-intro" aria-labelledby="scanner-title">
        <div className="scanner-hero">
          <PageHeader
            label="Guardrail scanner"
            titleId="scanner-title"
            title="Guard untrusted content before it reaches your agent."
            action={
              <div className="hero-actions">
                <a className="button primary-button" href="#scanner-workspace">
                  Run a check
                </a>
                <a className="button secondary-button" href="/sources">
                  Source tests
                </a>
              </div>
            }
          >
            <p>
              Paste a trusted task and untrusted content. AgentGate returns an
              allow, sanitize, or block decision with the exact output to use.
            </p>
          </PageHeader>

          <div className="hero-flow" aria-label="Guardrail workflow">
            <div>
              <span>01</span>
              <strong>Untrusted content</strong>
              <p>Ticket, page, file, webhook, or tool output.</p>
            </div>
            <div>
              <span>02</span>
              <strong>Guardrail decision</strong>
              <p>Classify injection risk and extract hostile instructions.</p>
            </div>
            <div>
              <span>03</span>
              <strong>Safe output</strong>
              <p>Allow, sanitize, or block before the agent sees it.</p>
            </div>
          </div>
        </div>
      </section>

      <SanitizeForm maxInputChars={getMaxInputChars()} />
    </main>
  );
}
