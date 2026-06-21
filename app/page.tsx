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
      </section>

      <SanitizeForm maxInputChars={getMaxInputChars()} />
    </main>
  );
}
