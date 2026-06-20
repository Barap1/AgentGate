import type {
  GuardrailModelResult,
  LlmProvider
} from "@/lib/guardrail/types";

export interface GuardrailProviderResponse {
  result: GuardrailModelResult;
  modelUsed: string;
  provider: LlmProvider;
}

export interface GuardrailProvider {
  check(input: {
    systemPrompt: string;
    userTask: string;
    sourceType: string;
    content: string;
    maxOutputTokens: number;
  }): Promise<GuardrailProviderResponse>;
}
