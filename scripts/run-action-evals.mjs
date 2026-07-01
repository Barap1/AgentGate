import { readFile } from "node:fs/promises";
import { join } from "node:path";

const baseUrl = process.env.AGENTGATE_EVAL_URL ?? "http://localhost:3000";
const riskRank = { low: 0, medium: 1, high: 2, critical: 3 };

process.env.AGENTGATE_TRUSTED_EMAIL_DOMAINS ??= "company.com";
process.env.AGENTGATE_TRUSTED_HTTP_HOSTS ??= "api.company.com,localhost";

const cases = JSON.parse(
  await readFile(join(process.cwd(), "evals", "action-cases.json"), "utf8")
);

function hasExpectedSignals(result, expectedSignals = []) {
  return expectedSignals.every((signal) =>
    result.detectedSignals?.some((detected) => detected.includes(signal))
  );
}

function lacksSignals(result, absentSignals = []) {
  return absentSignals.every(
    (signal) => !result.detectedSignals?.some((detected) => detected.includes(signal))
  );
}

async function runCase(testCase) {
  try {
    const response = await fetch(`${baseUrl}/api/action-guard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: testCase.agentId,
        sessionId: testCase.sessionId,
        trustedTask: testCase.trustedTask,
        sourceType: testCase.sourceType,
        priorInputVerdict: testCase.priorInputVerdict,
        priorInputRiskLevel: testCase.priorInputRiskLevel,
        action: testCase.action
      })
    });
    const result = await response.json();

    if (testCase.expectedStatus) {
      const pass =
        response.status === testCase.expectedStatus &&
        (!testCase.expectedError || result.error === testCase.expectedError);

      return {
        id: testCase.id,
        expected: testCase.expectedStatus,
        actual: response.status,
        risk: "n/a",
        pass,
        note: result.error ?? response.statusText
      };
    }

    if (!response.ok) {
      return {
        id: testCase.id,
        expected: testCase.expectedDecision,
        actual: "ERROR",
        risk: "n/a",
        pass: false,
        note: result.error ?? response.statusText
      };
    }

    const pass =
      result.decision === testCase.expectedDecision &&
      riskRank[result.riskLevel] >= riskRank[testCase.expectedMinimumRiskLevel] &&
      (!testCase.expectedMaximumRiskLevel ||
        riskRank[result.riskLevel] <= riskRank[testCase.expectedMaximumRiskLevel]) &&
      hasExpectedSignals(result, testCase.expectedSignals) &&
      lacksSignals(result, testCase.expectedAbsentSignals);

    return {
      id: testCase.id,
      expected: testCase.expectedDecision,
      actual: result.decision,
      risk: result.riskLevel,
      pass,
      note: result.reasons?.[0] ?? ""
    };
  } catch (error) {
    return {
      id: testCase.id,
      expected: testCase.expectedDecision,
      actual: "ERROR",
      risk: "n/a",
      pass: false,
      note: error instanceof Error ? error.message : "Request failed"
    };
  }
}

const rows = [];

for (const testCase of cases) {
  rows.push(await runCase(testCase));
}

console.table(rows);

if (rows.some((row) => !row.pass)) {
  process.exitCode = 1;
}
