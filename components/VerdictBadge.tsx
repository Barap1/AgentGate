import type { Verdict } from "@/lib/guardrail/types";
import { Badge } from "@/components/ui/badge";

type VerdictBadgeProps = {
  verdict: Verdict;
};

export function VerdictBadge({ verdict }: VerdictBadgeProps) {
  return (
    <Badge className={`verdict-badge ${verdict.toLowerCase()}`} variant="outline">
      {verdict}
    </Badge>
  );
}
