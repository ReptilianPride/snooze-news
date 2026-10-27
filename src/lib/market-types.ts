export type Sector = {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  weekAgoClose: number | null;
  weeklyChangePercent: number | null;
  asOf: string | null;
  anomaly: { isAnomaly: boolean; zScore: number } | null;
  error?: string;
};

export type MarketResponse = { updatedAt: string; okCount: number; sectors: Sector[] };