import "server-only";

import { buildGuardrailUserMessage } from "@/lib/guardrail/prompts";
import { parseGuardrailJson } from "@/lib/utils/json";
import type {
  GuardrailProvider,
  GuardrailProviderResponse
} from "@/lib/guardrail/providers/types";
import type { GuardrailModelResult } from "@/lib/guardrail/types";

const defaultBaseUrl = "https://api.groq.com/openai/v1";
const defaultPrimaryModel = "qwen/qwen3-32b";
const defaultFallbackModel = "llama-3.3-70b-versatile";

type GroqMessage = {
  content?: unknown;
};

type GroqChoice = {
  message?: GroqMessage;
};

type GroqResponse = {
  choices?: GroqChoice[];
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

function completionUrl() {
  return `${getEnv("GROQ_BASE_URL", defaultBaseUrl)!.replace(/\/$/, "")}/chat/completions`;
}

function requestTimeoutMs() {
  const parsed = Number.parseInt(getEnv("GROQ_TIMEOUT_MS", "30000")!, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30000;
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

function parseGroqJson(rawText: string): GuardrailModelResult {
  try {
    return parseGuardrailJson(rawText);
  } catch {
    const repairedJson = extractJsonObject(rawText);

    if (!repairedJson) {
      throw new Error(
        "Groq model did not return strict JSON and no JSON object could be extracted."
      );
    }

    try {
      return parseGuardrailJson(repairedJson);
    } catch {
      throw new Error(
        "Groq model returned JSON that did not match the guardrail schema."
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

function logProviderHeaders(response: Response, model: string) {
  const headers = [
    "retry-after",
    "x-ratelimit-limit-requests",
    "x-ratelimit-remaining-requests",
    "x-ratelimit-reset-requests",
    "x-ratelimit-limit-tokens",
    "x-ratelimit-remaining-tokens",
    "x-ratelimit-reset-tokens"
  ]
    .map((name) => [name, response.headers.get(name)])
    .filter((entry): entry is [string, string] => Boolean(entry[1]));

  if (headers.length > 0) {
    console.warn(
      "Groq provider response headers",
      Object.fromEntries([["model", model], ...headers])
    );
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
        lowerMessage.includes("overloaded") ||
        lowerMessage.includes("timeout") ||
        lowerMessage.includes("failed before receiving");

  return error;
}

function describeGroqFailure(error: unknown) {
  const providerError = error as ProviderError;
  const status = providerError.status;
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (providerError.authRelated) {
    return "Groq authentication failed. Check GROQ_API_KEY.";
  }

  if (status === 429 || message.includes("quota") || message.includes("rate")) {
    return "The provider may be rate-limited or temporarily unavailable.";
  }

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes("unavailable") ||
    message.includes("overloaded") ||
    message.includes("timeout")
  ) {
    return "Groq is temporarily unavailable.";
  }

  if (status === 400 || message.includes("model")) {
    return "Groq rejected the request. Check GROQ_PRIMARY_MODEL and GROQ_FALLBACK_MODEL.";
  }

  if (message.includes("json")) {
    return error instanceof Error ? error.message : "Groq returned invalid JSON.";
  }

  return "Groq request failed.";
}

async function requestModel({
  model,
  apiKey,
  systemPrompt,
  userTask,
  sourceType,
  content,
  maxOutputTokens
}: {
  model: string;
  apiKey: string;
  systemPrompt: string;
  userTask: string;
  sourceType: string;
  content: string;
  maxOutputTokens: number;
}): Promise<GuardrailModelResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs());
  let response: Response;

  try {
    response = await fetch(completionUrl(), {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
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
        temperature: 0.1,
        max_tokens: maxOutputTokens,
        response_format: { type: "json_object" }
      })
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Groq request timed out."
        : "Groq request failed before receiving a response.";
    throw createProviderError(message);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    logProviderHeaders(response, model);

    const errorBody = await readErrorBody(response);
    throw createProviderError(errorBody, response.status);
  }

  const data = (await response.json()) as GroqResponse;
  const contentText = data.choices?.[0]?.message?.content;

  if (typeof contentText !== "string" || contentText.trim().length === 0) {
    throw createProviderError("Groq returned an empty message content.");
  }

  return parseGroqJson(contentText);
}

export function createGroqProvider(): GuardrailProvider {
  return {
    async check(input): Promise<GuardrailProviderResponse> {
      const apiKey = getEnv("GROQ_API_KEY");

      if (!apiKey) {
        throw new Error("GROQ_API_KEY is not configured.");
      }

      const primaryModel = getEnv("GROQ_PRIMARY_MODEL", defaultPrimaryModel)!;
      const fallbackModel = getEnv("GROQ_FALLBACK_MODEL", defaultFallbackModel)!;
      const modelsToTry = primaryModel === fallbackModel
        ? [primaryModel]
        : [primaryModel, fallbackModel];
      const attempted: string[] = [];

      for (const model of modelsToTry) {
        attempted.push(model);

        try {
          return {
            result: await requestModel({
              model,
              apiKey,
              ...input
            }),
            modelUsed: model,
            provider: "groq"
          };
        } catch (error) {
          const providerError = error as ProviderError;
          const isLast = model === modelsToTry[modelsToTry.length - 1];

          if (providerError.authRelated || isLast || !providerError.retryable) {
            throw new Error(
              `Groq request failed after trying ${attempted.join(" and ")}. ${describeGroqFailure(error)}`
            );
          }
        }
      }

      throw new Error("Groq request failed before a model was attempted.");
    }
  };
}
