
export interface BrkFinancialData {
  totalEquity: number; // In millions
  totalAShares: number; // Exact count
  currentPrice: number;
  lastUpdated: string;
  sourceUrl?: string;
}

export interface CalculationResult {
  bookValuePerA: number;
  bookValuePerB: number;
  targets: {
    multiplier: number;
    price: number;
  }[];
}

export interface AppState {
  data: BrkFinancialData | null;
  loading: boolean;
  error: string | null;
  customPbr: number;
}
