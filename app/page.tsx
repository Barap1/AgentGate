import { AppHeader } from "@/components/AppHeader";
import { SanitizeForm } from "@/components/SanitizeForm";
import { getMaxInputChars } from "@/lib/utils/validation";

export default function Home() {
  return (
    <main className="page-shell" id="main-content">
      <AppHeader active="home" />

      <section className="scanner-intro" aria-labelledby="scanner-title">
        <div>
          <p className="section-kicker">Guardrail scanner</p>
          <h1 id="scanner-title">Inspect untrusted content before an agent reads it.</h1>
          <p>
            AgentGate checks retrieved text for injected instructions, extracts
            the suspect span, removes confident matches, and returns the content
            that would be passed to the agent.
          </p>
          <div className="hero-actions">
            <a className="button primary-button" href="#scanner-workspace">
              Start a scan
            </a>
            <a className="button secondary-button" href="/sources">
              Test sources
            </a>
          </div>
        </div>

        <ol className="workflow-strip" aria-label="AgentGate workflow">
          <li>
            <strong>Capture</strong>
            <span>Untrusted content enters</span>
          </li>
          <li>
            <strong>Classify</strong>
            <span>Guardrail model checks it</span>
          </li>
          <li>
            <strong>Extract</strong>
            <span>Injected instruction is isolated</span>
          </li>
          <li>
            <strong>Sanitize</strong>
            <span>Confident matches are removed</span>
          </li>
          <li>
            <strong>Return</strong>
            <span>Safe content is handed back</span>
          </li>
        </ol>
      </section>

      <SanitizeForm maxInputChars={getMaxInputChars()} />
    </main>
  );
}
