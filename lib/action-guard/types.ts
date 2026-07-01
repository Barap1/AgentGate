import type { RiskLevel, SourceType, Verdict } from "@/lib/guardrail/types";

export type ActionType =
  | "send_email"
  | "http_request"
  | "file_read"
  | "database_query"
  | "shell_command";

export type ActionDecision = "ALLOW" | "REVIEW" | "BLOCK" | "ERROR";

export type AgentAction = {
  type: ActionType;
  toolName: string;
  target: string;
  payload: string;
  metadata: Record<string, unknown>;
};

export type ActionGuardRequest = {
  agentId: string;
  sessionId: string;
  trustedTask: string;
  sourceType: SourceType;
  priorInputVerdict: Verdict | null;
  priorInputRiskLevel: RiskLevel | null;
  action: AgentAction;
};

export type DetectedSignal = {
  id: string;
  label: string;
  severity: RiskLevel;
  evidence?: string;
};

export type ActionPolicyMatch = {
  id: string;
  label: string;
  hardBlock?: boolean;
};

export type ActionGuardResult = {
  decision: ActionDecision;
  riskLevel: RiskLevel;
  riskScore: number;
  agentId: string;
  sessionId: string;
  actionType: ActionType;
  toolName: string;
  target: string;
  reasons: string[];
  matchedPolicies: string[];
  detectedSignals: string[];
  safeAlternative: string;
  requiresHumanApproval: boolean;
  warnings: string[];
  actionDecisionId: string | null;
  persisted: boolean;
};
