
export interface BrkFinancialData {
  totalEquity: number; // In millions
  totalAShares: number; // Exact count
  currentPrice: number;
  lastUpdated: string;
  sourceUrl?: string;
}

export interface HistoricalPoint {
  year: number;
  price: number;
  pbr: number;
  bvps: number;
}

export interface BacktestResult {
  labels: string[];
  holdValues: number[];
  strategyValues: number[];
  numTrades: number;
  holdRoi: number;
  strategyRoi: number;
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
