import "server-only";

import { buildGuardrailUserMessage } from "@/lib/guardrail/prompts";
import { parseGuardrailJson } from "@/lib/utils/json";
import type {
  GuardrailProvider,
  GuardrailProviderResponse
} from "@/lib/guardrail/providers/types";
import type { GuardrailModelResult } from "@/lib/guardrail/types";

type OpenRouterMessage = {
  content?: unknown;
};

type OpenRouterChoice = {
  message?: OpenRouterMessage;
};

type OpenRouterResponse = {
  choices?: OpenRouterChoice[];
};

type ProviderError = Error & {
  status?: number;
  authRelated?: boolean;
  retryable?: boolean;
};

function getEnv(name: string, fallback?: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function parseFallbackModels() {
  return (process.env.OPENROUTER_FALLBACK_MODELS ?? "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

function extractJsonObject(rawText: string) {
  const start = rawText.indexOf("{");

  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < rawText.length; index += 1) {
    const char = rawText[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return rawText.slice(start, index + 1);
      }
    }
  }

  return null;
}

function parseOpenRouterJson(rawText: string): GuardrailModelResult {
  try {
    return parseGuardrailJson(rawText);
  } catch {
    const repairedJson = extractJsonObject(rawText);

    if (!repairedJson) {
      throw new Error(
        "OpenRouter model did not return strict JSON and no JSON object could be extracted."
      );
    }

    try {
      return parseGuardrailJson(repairedJson);
    } catch {
      throw new Error(
        "OpenRouter model returned JSON that did not match the guardrail schema."
      );
    }
  }
}

async function readErrorBody(response: Response) {
  try {
    const text = await response.text();
    const parsed = JSON.parse(text) as { error?: { message?: string } };

    return parsed.error?.message ?? text;
  } catch {
    return response.statusText;
  }
}

function isAuthStatus(status: number) {
  return status === 401 || status === 403;
}

function isRetryableStatus(status: number) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function createProviderError(message: string, status?: number): ProviderError {
  const lowerMessage = message.toLowerCase();
  const error = new Error(message) as ProviderError;
  error.status = status;
  error.authRelated =
    status !== undefined
      ? isAuthStatus(status)
      : lowerMessage.includes("auth") ||
        lowerMessage.includes("api key") ||
        lowerMessage.includes("unauthorized") ||
        lowerMessage.includes("forbidden");
  error.retryable =
    status !== undefined
      ? isRetryableStatus(status)
      : lowerMessage.includes("rate") ||
        lowerMessage.includes("quota") ||
        lowerMessage.includes("unavailable") ||
        lowerMessage.includes("overloaded");

  return error;
}

function describeOpenRouterFailure(error: unknown) {
  const providerError = error as ProviderError;
  const status = providerError.status;
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (providerError.authRelated) {
    return "OpenRouter authentication failed. Check OPENROUTER_API_KEY.";
  }

  if (status === 429 || message.includes("quota") || message.includes("rate")) {
    return "OpenRouter quota, rate limit, or free-model capacity was exceeded.";
  }

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes("unavailable") ||
    message.includes("overloaded")
  ) {
    return "OpenRouter or the selected upstream model is temporarily unavailable.";
  }

  if (status === 400 || message.includes("model")) {
    return "OpenRouter rejected the request. Check OPENROUTER_MODEL and OPENROUTER_FALLBACK_MODELS.";
  }

  if (message.includes("json")) {
    return error instanceof Error ? error.message : "OpenRouter returned invalid JSON.";
  }

  return "OpenRouter request failed.";
}

async function requestModel({
  model,
  apiKey,
  siteUrl,
  appName,
  systemPrompt,
  userTask,
  sourceType,
  content,
  maxOutputTokens
}: {
  model: string;
  apiKey: string;
  siteUrl: string;
  appName: string;
  systemPrompt: string;
  userTask: string;
  sourceType: string;
  content: string;
  maxOutputTokens: number;
}): Promise<GuardrailModelResult> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": siteUrl,
      "X-OpenRouter-Title": appName
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: buildGuardrailUserMessage({
            userTask,
            sourceType,
            content
          })
        }
      ],
      temperature: 0,
      max_tokens: maxOutputTokens,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errorBody = await readErrorBody(response);
    throw createProviderError(errorBody, response.status);
  }

  const data = (await response.json()) as OpenRouterResponse;
  const contentText = data.choices?.[0]?.message?.content;

  if (typeof contentText !== "string" || contentText.trim().length === 0) {
    throw createProviderError("OpenRouter returned an empty message content.");
  }

  return parseOpenRouterJson(contentText);
}

export function createOpenRouterProvider(): GuardrailProvider {
  return {
    async check(input): Promise<GuardrailProviderResponse> {
      const apiKey = getEnv("OPENROUTER_API_KEY");

      if (!apiKey) {
        throw new Error(
          "OPENROUTER_API_KEY is not configured. Set LLM_PROVIDER=openrouter and add an OpenRouter API key, or configure GEMINI_API_KEY."
        );
      }

      const primaryModel = getEnv(
        "OPENROUTER_MODEL",
        "nvidia/nemotron-3-super:free"
      )!;
      const modelsToTry = [primaryModel, ...parseFallbackModels()];
      const siteUrl = getEnv("OPENROUTER_SITE_URL", "http://localhost:3000")!;
      const appName = getEnv("OPENROUTER_APP_NAME", "AgentGate")!;
      const attempted: string[] = [];

      for (const model of modelsToTry) {
        attempted.push(model);

        try {
          return {
            result: await requestModel({
              model,
              apiKey,
              siteUrl,
              appName,
              ...input
            }),
            modelUsed: model,
            provider: "openrouter"
          };
        } catch (error) {
          const providerError = error as ProviderError;
          const isLast = model === modelsToTry[modelsToTry.length - 1];

          if (providerError.authRelated || isLast || !providerError.retryable) {
            throw new Error(
              `OpenRouter request failed after trying ${attempted.join(", ")}: ${describeOpenRouterFailure(error)}`
            );
          }
        }
      }

      throw new Error("OpenRouter request failed before a model was attempted.");
    }
  };
}
