import "server-only";

import { createOpenRouterProvider } from "@/lib/guardrail/providers/openrouter";
import type { GuardrailProvider } from "@/lib/guardrail/providers/types";

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function shouldUseOpenRouter() {
  const provider = process.env.LLM_PROVIDER?.trim().toLowerCase();

  return (provider === undefined || provider === "" || provider === "openrouter") &&
    hasEnv("OPENROUTER_API_KEY");
}

export function getGuardrailProvider(): GuardrailProvider {
  if (shouldUseOpenRouter()) {
    return createOpenRouterProvider();
  }

  throw new Error(
    "No usable guardrail provider is configured. Set OPENROUTER_API_KEY for OpenRouter."
  );
}
