import { AppHeader } from "@/components/AppHeader";
import { SourcesTester } from "@/components/SourcesTester";

export default function SourcesPage() {
  return (
    <main className="page-shell sources-shell" id="main-content">
      <AppHeader active="sources" />

      <section className="sources-hero">
        <p className="section-kicker">Sources</p>
        <h1>Test the ways untrusted content enters AgentGate.</h1>
        <p>
          Use webhook, URL, and file ingestion paths before wiring external
          systems into an agent workflow.
        </p>
      </section>

      <SourcesTester />
    </main>
  );
}
