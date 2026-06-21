import { readFile } from "node:fs/promises";
import { join } from "node:path";

const baseUrl = process.env.AGENTGATE_EVAL_URL ?? "http://localhost:3000";
const riskRank = { low: 0, medium: 1, high: 2, critical: 3 };
const cases = JSON.parse(
  await readFile(join(process.cwd(), "evals", "cases.json"), "utf8")
);

async function runCase(testCase) {
  try {
    const response = await fetch(`${baseUrl}/api/sanitize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userTask: testCase.userTask,
        sourceType: testCase.sourceType,
        content: testCase.content
      })
    });
    const result = await response.json();

    if (!response.ok) {
      return {
        id: testCase.id,
        expected: testCase.expectedAction,
        actual: "ERROR",
        risk: "n/a",
        pass: false,
        note: result.error ?? response.statusText
      };
    }

    const pass =
      result.containsInjection === testCase.expectedContainsInjection &&
      result.verdict === testCase.expectedAction &&
      riskRank[result.riskLevel] >= riskRank[testCase.expectedMinimumRiskLevel];

    return {
      id: testCase.id,
      expected: testCase.expectedAction,
      actual: result.verdict,
      risk: result.riskLevel,
      pass,
      note: result.reason
    };
  } catch (error) {
    return {
      id: testCase.id,
      expected: testCase.expectedAction,
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
