import { AppHeader } from "@/components/AppHeader";
import { AuthForm } from "@/components/AuthForm";
import { PageHeader } from "@/components/PageHeader";

export default function LoginPage() {
  return (
    <main className="page-shell auth-shell" id="main-content">
      <AppHeader active="login" />
      <PageHeader label="Account" title="Sign in or create an account.">
        <p>
          AgentGate uses Supabase Auth so saved guardrail runs stay scoped to
          your account.
        </p>
      </PageHeader>
      <AuthForm />
    </main>
  );
}
