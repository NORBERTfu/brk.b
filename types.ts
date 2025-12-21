
export interface BrkFinancialData {
  totalEquity: number; // In millions
  totalAShares: number; // Exact count
  currentPrice: number;
  lastUpdated: string;
  sourceUrl?: string;
}

export interface PbrDistribution {
  range: string;
  percentage: number;
  count: number;
}

export interface BacktestResult {
  labels: string[];
  holdValues: number[];
  qqqHoldValues: number[]; // Baseline: Pure QQQ Buy & Hold
  strategyValues: number[]; // Strategy: BRK.B < 1.45 -> QQQ > 1.55
  holdingTimeline: { label: string; asset: 'BRK.B' | 'QQQ' }[]; // Which asset was held at each point
  numTrades: number;
  holdRoi: number;
  qqqRoi: number;
  strategyRoi: number;
  optimalBuyPbr: number;
  optimalSellPbr: number;
  description: string;
}

export interface CalculationResult {
  bookValuePerA: number;
  bookValuePerB: number;
  targets: {
    multiplier: number;
    price: number;
  }[];
}
