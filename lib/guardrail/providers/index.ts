import "server-only";

import { createGeminiProvider } from "@/lib/guardrail/providers/gemini";
import { createOpenRouterProvider } from "@/lib/guardrail/providers/openrouter";
import type { GuardrailProvider } from "@/lib/guardrail/providers/types";
import type { LlmProvider } from "@/lib/guardrail/types";

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function requestedProvider(): LlmProvider | null {
  const provider = process.env.LLM_PROVIDER?.trim().toLowerCase();

  if (provider === "openrouter" || provider === "gemini") {
    return provider;
  }

  return null;
}

function autoSelectProvider(): LlmProvider | null {
  if (hasEnv("OPENROUTER_API_KEY")) {
    return "openrouter";
  }

  if (hasEnv("GEMINI_API_KEY")) {
    return "gemini";
  }

  return null;
}

export function getGuardrailProvider(): GuardrailProvider {
  const provider = requestedProvider() ?? autoSelectProvider();

  if (provider === "openrouter") {
    return createOpenRouterProvider();
  }

  if (provider === "gemini") {
    return createGeminiProvider();
  }

  throw new Error(
    "No usable guardrail provider is configured. Set OPENROUTER_API_KEY for OpenRouter or GEMINI_API_KEY for Gemini."
  );
}
