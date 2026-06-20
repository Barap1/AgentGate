import type { Verdict } from "@/lib/guardrail/types";

type VerdictBadgeProps = {
  verdict: Verdict;
};

export function VerdictBadge({ verdict }: VerdictBadgeProps) {
  return <span className={`verdict-badge ${verdict.toLowerCase()}`}>{verdict}</span>;
}
