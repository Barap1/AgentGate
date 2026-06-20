import "server-only";

import { GoogleGenAI } from "@google/genai";
import { buildGuardrailUserMessage } from "@/lib/guardrail/prompts";
import { parseGuardrailJson } from "@/lib/utils/json";
import type {
  GuardrailProvider,
  GuardrailProviderResponse
} from "@/lib/guardrail/providers/types";
import type { GuardrailModelResult } from "@/lib/guardrail/types";

function getEnv(name: string, fallback?: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function isFallbackEligible(error: unknown) {
  const maybeStatus = (error as { status?: number; code?: number }) ?? {};
  const status = maybeStatus.status ?? maybeStatus.code;
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes("rate") ||
    message.includes("quota") ||
    message.includes("unavailable") ||
    message.includes("overloaded")
  );
}

function describeGeminiFailure(error: unknown) {
  const maybeStatus = (error as { status?: number; code?: number }) ?? {};
  const status = maybeStatus.status ?? maybeStatus.code;
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (status === 429 || message.includes("quota") || message.includes("rate")) {
    return "Gemini quota or rate limit was exceeded.";
  }

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes("unavailable") ||
    message.includes("overloaded")
  ) {
    return "Gemini is temporarily unavailable.";
  }

  if (status === 400 || message.includes("model")) {
    return "Gemini rejected the request. Check GEMINI_MODEL and GEMINI_FALLBACK_MODEL.";
  }

  if (message.includes("api key") || message.includes("permission")) {
    return "Gemini authentication failed. Check GEMINI_API_KEY.";
  }

  return "Gemini request failed.";
}

async function generateWithModel({
  ai,
  model,
  prompt,
  maxOutputTokens
}: {
  ai: GoogleGenAI;
  model: string;
  prompt: string;
  maxOutputTokens: number;
}): Promise<GuardrailModelResult> {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0,
      maxOutputTokens,
      responseMimeType: "application/json"
    }
  });

  const text = response.text;

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return parseGuardrailJson(text);
}

export function createGeminiProvider(): GuardrailProvider {
  return {
    async check(input): Promise<GuardrailProviderResponse> {
      const apiKey = getEnv("GEMINI_API_KEY");

      if (!apiKey) {
        throw new Error(
          "GEMINI_API_KEY is not configured. Set LLM_PROVIDER=gemini and add a Google AI Studio API key, or configure OPENROUTER_API_KEY."
        );
      }

      const primaryModel = getEnv("GEMINI_MODEL", "gemini-2.5-flash-lite")!;
      const fallbackModel = getEnv("GEMINI_FALLBACK_MODEL");
      const modelsToTry = [primaryModel, ...(fallbackModel ? [fallbackModel] : [])];
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `${input.systemPrompt}

Analyze this input:

${buildGuardrailUserMessage(input)}`;

      const attempted: string[] = [];

      for (const model of modelsToTry) {
        attempted.push(model);

        try {
          return {
            result: await generateWithModel({
              ai,
              model,
              prompt,
              maxOutputTokens: input.maxOutputTokens
            }),
            modelUsed: model,
            provider: "gemini"
          };
        } catch (error) {
          const isLast = model === modelsToTry[modelsToTry.length - 1];

          if (isLast || !isFallbackEligible(error)) {
            throw new Error(
              `Gemini request failed after trying ${attempted.join(", ")}: ${describeGeminiFailure(error)}`
            );
          }
        }
      }

      throw new Error("Gemini request failed before a model was attempted.");
    }
  };
}
