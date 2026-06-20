import type { RiskLevel } from "@/lib/guardrail/types";

type RiskMeterProps = {
  score: number;
  level: RiskLevel;
};

export function RiskMeter({ score, level }: RiskMeterProps) {
  return (
    <div className={`risk-meter ${level}`}>
      <div className="risk-meter-header">
        <span>Risk</span>
        <strong>
          {level} - {score}/100
        </strong>
      </div>
      <div className="risk-track" aria-hidden="true">
        <span style={{ width: `${Math.max(0, Math.min(score, 100))}%` }} />
      </div>
    </div>
  );
}
