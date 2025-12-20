
export interface BrkFinancialData {
  totalEquity: number; // In millions
  totalAShares: number; // Exact count
  currentPrice: number;
  lastUpdated: string;
  sourceUrl?: string;
}

export interface BacktestResult {
  labels: string[];
  holdValues: number[];
  strategyValues: number[]; // Strategy: BRK.B < 1.5 -> QQQ > 1.6
  numTrades: number;
  holdRoi: number;
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
