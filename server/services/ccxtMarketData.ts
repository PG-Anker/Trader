import * as ccxt from 'ccxt';

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  change24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class CCXTMarketDataService {
  private exchange: ccxt.Exchange;
  private markets: { [key: string]: any } = {};
  private lastUpdate: number = 0;
  private updateInterval: number = 30000; // 30 seconds

  constructor() {
    // Initialize Bybit exchange for market data only (no API keys needed for public data)
    this.exchange = new (ccxt as any).bybit({
      sandbox: false, // Use mainnet for market data
      enableRateLimit: true,
      timeout: 30000,
    });
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing CCXT market data service...');
      
      // Load markets
      this.markets = await this.exchange.loadMarkets();
      
      // Filter for USDT pairs only
      const usdtPairs = Object.keys(this.markets).filter(symbol => 
        symbol.includes('/USDT') && 
        this.markets[symbol].active &&
        this.markets[symbol].type === 'spot'
      );
      
      console.log(`✅ Loaded ${usdtPairs.length} USDT trading pairs`);
      console.log('Sample pairs:', usdtPairs.slice(0, 10));
      
    } catch (error) {
      console.error('❌ Failed to initialize CCXT service:', error);
      throw error;
    }
  }

  async getAllUSDTPairs(): Promise<string[]> {
    if (Object.keys(this.markets).length === 0) {
      await this.initialize();
    }
    
    return Object.keys(this.markets).filter(symbol => 
      symbol.includes('/USDT') && 
      this.markets[symbol].active &&
      this.markets[symbol].type === 'spot'
    );
  }

  async getTopTradingPairs(limit: number = 50): Promise<string[]> {
    try {
      const tickers = await this.exchange.fetchTickers();
      
      // Filter USDT pairs and sort by volume
      const usdtTickers = Object.entries(tickers)
        .filter(([symbol]) => symbol.includes('/USDT'))
        .sort(([,a], [,b]) => (b.quoteVolume || 0) - (a.quoteVolume || 0))
        .slice(0, limit)
        .map(([symbol]) => symbol);
      
      return usdtTickers;
    } catch (error) {
      console.error('Error fetching top trading pairs:', error);
      // Fallback to predefined list
      return [
        'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT',
        'DOGE/USDT', 'MATIC/USDT', 'SOL/USDT', 'DOT/USDT', 'AVAX/USDT'
      ];
    }
  }

  async getMarketData(symbols?: string[]): Promise<MarketData[]> {
    try {
      const targetSymbols = symbols || await this.getTopTradingPairs(100);
      const tickers = await this.exchange.fetchTickers(targetSymbols);
      
      const marketData: MarketData[] = [];
      
      for (const [symbol, ticker] of Object.entries(tickers)) {
        if (ticker.last && ticker.quoteVolume) {
          marketData.push({
            symbol,
            price: ticker.last,
            volume: ticker.quoteVolume,
            change24h: ticker.percentage || 0,
            high24h: ticker.high || ticker.last,
            low24h: ticker.low || ticker.last,
            timestamp: ticker.timestamp || Date.now()
          });
        }
      }
      
      console.log(`📊 Fetched market data for ${marketData.length} symbols`);
      return marketData;
      
    } catch (error) {
      console.error('Error fetching market data:', error);
      return [];
    }
  }

  async getOHLCV(symbol: string, timeframe: string = '15m', limit: number = 100): Promise<OHLCV[]> {
    try {
      const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
      
      return ohlcv.map(([timestamp, open, high, low, close, volume]) => ({
        timestamp: Number(timestamp),
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: Number(volume)
      }));
      
    } catch (error) {
      console.error(`Error fetching OHLCV for ${symbol}:`, error);
      return [];
    }
  }

  async getTicker(symbol: string): Promise<MarketData | null> {
    try {
      const ticker = await this.exchange.fetchTicker(symbol);
      
      if (!ticker.last) {
        return null;
      }
      
      return {
        symbol,
        price: ticker.last,
        volume: ticker.quoteVolume || 0,
        change24h: ticker.percentage || 0,
        high24h: ticker.high || ticker.last,
        low24h: ticker.low || ticker.last,
        timestamp: ticker.timestamp || Date.now()
      };
      
    } catch (error) {
      console.error(`Error fetching ticker for ${symbol}:`, error);
      return null;
    }
  }

  async startMarketDataUpdates(callback: (data: MarketData[]) => void): Promise<void> {
    console.log('🚀 Starting market data updates every 30 seconds...');
    
    const updateData = async () => {
      try {
        const marketData = await this.getMarketData();
        if (marketData.length > 0) {
          callback(marketData);
          this.lastUpdate = Date.now();
        }
      } catch (error) {
        console.error('Error in market data update:', error);
      }
    };

    // Initial update
    await updateData();
    
    // Set up periodic updates
    setInterval(updateData, this.updateInterval);
  }

  getLastUpdateTime(): number {
    return this.lastUpdate;
  }

  isDataFresh(maxAgeMs: number = 60000): boolean {
    return (Date.now() - this.lastUpdate) < maxAgeMs;
  }
}

// Export singleton instance
export const ccxtMarketData = new CCXTMarketDataService();