export type SourceType =
  | "support_ticket"
  | "email"
  | "slack_message"
  | "webpage"
  | "document"
  | "tool_output"
  | "manual_test";

export type Verdict = "ALLOW" | "SANITIZE" | "BLOCK" | "ERROR";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type LlmProvider = "openrouter";

export type PromptStrategy =
  | "basic"
  | "definition_enhanced"
  | "strict_extraction";

export interface SanitizeRequest {
  userTask: string;
  sourceType: SourceType;
  content: string;
  promptStrategy?: PromptStrategy;
}

export interface GuardrailModelResult {
  containsInjection: boolean;
  injectedPrompt: string | null;
  confidence: number;
  reason: string;
  categories: string[];
}

export interface SanitizeResult {
  containsInjection: boolean;
  verdict: Verdict;
  riskLevel: RiskLevel;
  riskScore: number;
  sourceType: SourceType;
  userTask: string;
  originalContent: string;
  extractedInjection: string | null;
  sanitizedContent: string;
  removed: boolean;
  provider: LlmProvider;
  modelUsed: string;
  promptStrategy: string;
  reason: string;
  categories: string[];
  warnings: string[];
  runId?: string | null;
  persisted?: boolean;
}
