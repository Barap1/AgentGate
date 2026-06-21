import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";
import { SourcesTester } from "@/components/SourcesTester";

export default function SourcesPage() {
  return (
    <main className="page-shell sources-shell" id="main-content">
      <AppHeader active="sources" />

      <PageHeader
        label="Sources"
        title="Test each untrusted content path before connecting it."
      >
        <p>
          Use webhook, URL, and file ingestion paths before wiring external
          systems into an agent workflow.
        </p>
      </PageHeader>

      <SourcesTester />
    </main>
  );
}
