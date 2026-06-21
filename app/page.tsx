import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";
import { SanitizeForm } from "@/components/SanitizeForm";
import { getMaxInputChars } from "@/lib/utils/validation";

export default function Home() {
  return (
    <main className="page-shell" id="main-content">
      <AppHeader active="home" />

      <section className="scanner-intro" aria-labelledby="scanner-title">
        <PageHeader
          label="Guardrail scanner"
          titleId="scanner-title"
          title="Check untrusted content before it reaches an agent."
          action={
            <div className="hero-actions">
              <a className="button primary-button" href="#scanner-workspace">
                Start scan
              </a>
              <a className="button secondary-button" href="/sources">
                Test sources
              </a>
            </div>
          }
        >
          <p>
            Untrusted content enters, AgentGate checks for injected
            instructions, then returns sanitized content or blocks the output.
          </p>
        </PageHeader>

        <ol className="workflow-strip" aria-label="AgentGate workflow">
          <li>
            <strong>Untrusted content</strong>
            <span>Ticket, page, file, email, or tool output</span>
          </li>
          <li>
            <strong>Guardrail check</strong>
            <span>Classify, score risk, and extract injection</span>
          </li>
          <li>
            <strong>Extraction/removal</strong>
            <span>Remove confident matches conservatively</span>
          </li>
          <li>
            <strong>Safe output or block</strong>
            <span>Return sanitized content or stop the handoff</span>
          </li>
        </ol>
      </section>

      <SanitizeForm maxInputChars={getMaxInputChars()} />
    </main>
  );
}
