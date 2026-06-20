import { AppHeader } from "@/components/AppHeader";
import { SanitizeForm } from "@/components/SanitizeForm";
import { getMaxInputChars } from "@/lib/utils/validation";

export default function Home() {
  return (
    <main className="page-shell">
      <AppHeader active="scanner" />

      <section className="scanner-intro" aria-labelledby="scanner-title">
        <div>
          <p className="section-kicker">Guardrail scanner</p>
          <h1 id="scanner-title">Inspect untrusted content before an agent reads it.</h1>
          <p>
            AgentGate checks retrieved text for injected instructions, extracts
            the suspect span, removes confident matches, and returns the content
            that would be passed to the agent.
          </p>
        </div>

        <ol className="workflow-strip" aria-label="AgentGate workflow">
          <li>Untrusted content enters</li>
          <li>Guardrail model checks it</li>
          <li>Injected instruction is extracted</li>
          <li>Fuzzy removal sanitizes it</li>
          <li>Safe content is returned</li>
        </ol>
      </section>

      <SanitizeForm maxInputChars={getMaxInputChars()} />
    </main>
  );
}
