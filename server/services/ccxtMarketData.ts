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
      rateLimit: 2000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      // Fix URL encoding issues
      urlencode: false,
      // Disable automatic URL encoding to prevent double-encoding
      options: {
        'adjustForTimeDifference': true,
        'recvWindow': 5000,
      }
    });
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing CCXT market data service...');
      
      // Try with cleaner configuration to avoid URL encoding issues
      this.exchange = new (ccxt as any).bybit({
        sandbox: false,
        enableRateLimit: true,
        timeout: 30000,
        rateLimit: 2000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        },
        options: {
          adjustForTimeDifference: true,
          recvWindow: 5000,
        },
        // Ensure URLs are not double-encoded
        urls: {
          api: {
            public: 'https://api.bybit.com',
            private: 'https://api.bybit.com'
          }
        }
      });
      
      // Load markets with retry logic
      let retries = 3;
      while (retries > 0) {
        try {
          this.markets = await this.exchange.loadMarkets();
          break;
        } catch (error) {
          console.log(`Market loading attempt failed, ${retries - 1} retries left:`, error.message);
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
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
      console.log('Falling back to predefined symbol list for API limitations');
      // Don't throw error, just use fallback pairs
      this.markets = {}; // Empty markets will trigger fallback behavior
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
      console.log('🔄 Fetching top trading pairs...');
      
      // Try to fetch from different endpoints or use hard-coded comprehensive list
      console.log('📝 Using comprehensive USDT pairs list due to API limitations');
      
      // Comprehensive list of popular USDT trading pairs
      const allUsdtPairs = [
        'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT',
        'DOGE/USDT', 'MATIC/USDT', 'SOL/USDT', 'DOT/USDT', 'AVAX/USDT',
        'LINK/USDT', 'UNI/USDT', 'LTC/USDT', 'BCH/USDT', 'ATOM/USDT',
        'FIL/USDT', 'TRX/USDT', 'ETC/USDT', 'MANA/USDT', 'SAND/USDT',
        'ALGO/USDT', 'VET/USDT', 'ICP/USDT', 'THETA/USDT', 'FTM/USDT',
        'AXS/USDT', 'AAVE/USDT', 'MKR/USDT', 'COMP/USDT', 'YFI/USDT',
        'SUSHI/USDT', 'SNX/USDT', 'CRV/USDT', 'BAL/USDT', 'REN/USDT',
        'KNC/USDT', 'ZRX/USDT', 'BAT/USDT', 'REP/USDT', 'STORJ/USDT',
        'ENJ/USDT', 'MANA/USDT', 'CHZ/USDT', 'HOT/USDT', 'ZIL/USDT',
        'IOST/USDT', 'QTUM/USDT', 'ICX/USDT', 'OMG/USDT', 'NANO/USDT',
        'XTZ/USDT', 'WAVES/USDT', 'DASH/USDT', 'NEO/USDT', 'GAS/USDT',
        'ONT/USDT', 'ZEC/USDT', 'XMR/USDT', 'IOTA/USDT', 'EOS/USDT',
        'XLM/USDT', 'TRB/USDT', 'BAND/USDT', 'RLC/USDT', 'ALPHA/USDT',
        'OCEAN/USDT', 'CTK/USDT', 'AKRO/USDT', 'AXS/USDT', 'HARD/USDT',
        'STRAX/USDT', 'UNFI/USDT', 'ROSE/USDT', 'AVA/USDT', 'XVS/USDT',
        'SXP/USDT', 'CREAM/USDT', 'BAKE/USDT', 'TWT/USDT', 'BURGER/USDT',
        'SFP/USDT', 'LINEAR/USDT', 'CAKE/USDT', 'SPARTA/USDT', 'UNISWAP/USDT',
        'ORN/USDT', 'UTK/USDT', 'XVS/USDT', 'ALPHA/USDT', 'NEAR/USDT',
        'FIRO/USDT', 'AVA/USDT', 'JOE/USDT', 'ACH/USDT', 'IMX/USDT',
        'GLMR/USDT', 'LOKA/USDT', 'API3/USDT', 'BICO/USDT', 'FLUX/USDT'
      ];
      
      return allUsdtPairs.slice(0, limit);
    } catch (error) {
      console.error('Error fetching top trading pairs:', error);
      // Fallback to essential pairs
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
      // Try with rate limiting to avoid geo-blocking
      await new Promise(resolve => setTimeout(resolve, 1000));
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
      
      // Return empty array when real data is not available
      // Bot will skip analysis for this symbol
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