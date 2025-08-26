export interface Position {
  id: number;
  symbol: string;
  direction: 'UP' | 'LONG' | 'SHORT';
  entryPrice: string;
  currentPrice: string;
  stopLoss: string;
  takeProfit: string;
  quantity: string;
  pnl: string;
  status: 'open' | 'closed';
  tradingMode: 'spot' | 'leverage';
  strategy?: string;
  isPaperTrade: boolean;
  createdAt: string;
}

export interface Trade {
  id: number;
  symbol: string;
  direction: 'UP' | 'LONG' | 'SHORT';
  entryPrice: string;
  exitPrice: string;
  quantity: string;
  pnl: string;
  duration: number;
  strategy?: string;
  tradingMode: 'spot' | 'leverage';
  isPaperTrade: boolean;
  entryTime: string;
  exitTime: string;
}

export interface BotLog {
  id: number;
  level: string;
  message: string;
  symbol?: string;
  data?: any;
  createdAt: string;
}

export interface SystemError {
  id: number;
  level: 'INFO' | 'WARNING' | 'ERROR';
  title: string;
  message: string;
  source?: string;
  errorCode?: string;
  resolved: boolean;
  createdAt: string;
}

export interface TradingSettings {
  id: number;
  usdtPerTrade: string;
  maxPositions: number;
  riskPerTrade: string;
  stopLoss: string;
  takeProfit: string;
  apiKey?: string;
  secretKey?: string;
  environment: 'mainnet';
  spotPaperTrading: boolean;
  leveragePaperTrading: boolean;
  aiTradingEnabled: boolean;
  rsiPeriod: number;
  rsiLow: number;
  rsiHigh: number;
  emaFast: number;
  emaSlow: number;
  macdSignal: number;
  adxPeriod: number;
  strategies: {
    trendFollowing: boolean;
    meanReversion: boolean;
    breakoutTrading: boolean;
    pullbackTrading: boolean;
  };
  timeframe: string;
  minConfidence: number;
}

export interface TradingStats {
  openPositions: number;
  todayPnL: string;
  winRate: string;
  activeTrades: number;
}

export interface TradingSummary {
  wonTrades: number;
  lostTrades: number;
  openTrades: number;
  totalProfit: string;
  totalLoss: string;
  netPnL: string;
  roi: string;
  avgWin: string;
  avgLoss: string;
  maxDrawdown: string;
  profitFactor: string;
  overallWinRate: string;
}

export interface TradingOpportunity {
  symbol: string;
  strategy: string;
  confidence: number;
  description: string;
  indicators: string;
}

export interface StrategyPerformance {
  strategy: string;
  winRate: number;
}

export interface PortfolioData {
  totalValue: string;
  availableBalance: string;
}
