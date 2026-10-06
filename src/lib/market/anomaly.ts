import { dailyReturns, mean, stdDev, zScore } from "./stats";

export const ANOMALY_THRESHOLD = 1;

export type AnomalyResult = {
  currentReturn: number;
  baselineMean: number;
  baselineStd: number;
  zScore: number;
  isAnomaly: boolean;
};

export function computeAnomaly(closes: number[]): AnomalyResult | null {
  const returns = dailyReturns(closes);

  // Need 30 baseline returns plus 1 current return = 31
  if (returns.length < 31) return null;

  const currentReturn = returns.at(-1)!;
  const baseline = returns.slice(-31, -1); // previous 30 trading days, excluding today

  const baselineMean = mean(baseline);
  const baselineStd = stdDev(baseline);
  const z = zScore(currentReturn, baselineMean, baselineStd);

  return {
    currentReturn,
    baselineMean,
    baselineStd,
    zScore: z,
    isAnomaly: Math.abs(z) >= ANOMALY_THRESHOLD,
  };
}