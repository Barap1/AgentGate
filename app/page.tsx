import { SanitizeForm } from "@/components/SanitizeForm";

export default function Home() {
  return (
    <main className="shell">
      <section className="intro">
        <div>
          <p className="eyebrow">AgentGate Phase 1</p>
          <h1>Prompt-injection sanitization gateway</h1>
          <p className="lede">
            Test untrusted agent inputs against a guardrail LLM, extract injected
            instructions, remove obvious matches, and inspect the resulting risk
            verdict before data reaches a backend agent.
          </p>
        </div>
        <div className="demo-notice" role="note">
          <strong>Demo notice:</strong> do not submit real secrets,
          credentials, private customer data, or sensitive company content.
        </div>
      </section>
      <SanitizeForm />
    </main>
  );
}
