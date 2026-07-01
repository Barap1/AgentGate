import "server-only";

import { createGroqProvider } from "@/lib/guardrail/providers/groq";
import type { GuardrailProvider } from "@/lib/guardrail/providers/types";

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

export function getGuardrailProvider(): GuardrailProvider {
  if (hasEnv("GROQ_API_KEY")) {
    return createGroqProvider();
  }

  throw new Error(
    "No usable guardrail provider is configured. Set GROQ_API_KEY."
  );
}
