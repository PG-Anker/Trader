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
  private spotExchange: ccxt.Exchange;
  private linearExchange: ccxt.Exchange;
  private markets: { [key: string]: any } = {};
  private lastUpdate: number = 0;
  private updateInterval: number = 30000; // 30 seconds

  constructor() {
    // Separate clients for spot and linear markets to avoid wrong defaultType issues
    const baseConfig = {
      sandbox: false,
      enableRateLimit: true,
      timeout: 30000,
      rateLimit: 3000, // Increased to 3 seconds for better rate limiting
      headers: {
        'User-Agent': 'CryptoBot-Pro/1.0 (Trading Bot)',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      options: {
        adjustForTimeDifference: true,
        recvWindow: 5000,
      }
    };

    // Spot market client for buy/sell trading
    this.spotExchange = new (ccxt as any).bybit({
      ...baseConfig,
      options: {
        ...baseConfig.options,
        defaultType: 'spot' // Critical: spot market access
      }
    });

    // Linear market client for long/short leverage trading  
    this.linearExchange = new (ccxt as any).bybit({
      ...baseConfig,
      options: {
        ...baseConfig.options,
        defaultType: 'linear' // Critical: USDT perpetual futures access
      }
    });
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing CCXT market data service with dual clients...');
      
      // Load markets for both exchanges with retry logic
      let retries = 3;
      while (retries > 0) {
        try {
          console.log(`📡 Loading spot markets (attempt ${4 - retries}/3)...`);
          const spotMarkets = await this.spotExchange.loadMarkets();
          console.log(`✅ Loaded ${Object.keys(spotMarkets).length} spot markets`);
          
          console.log(`📡 Loading linear markets (attempt ${4 - retries}/3)...`);
          const linearMarkets = await this.linearExchange.loadMarkets();
          console.log(`✅ Loaded ${Object.keys(linearMarkets).length} linear markets`);
          
          // Combine markets for symbol lookup
          this.markets = { ...spotMarkets, ...linearMarkets };
          console.log(`✅ Total markets available: ${Object.keys(this.markets).length}`);
          break;
        } catch (error) {
          retries--;
          console.error(`❌ Market loading failed (${retries} retries left):`, error instanceof Error ? error.message : 'Unknown error');
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
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
      const tickers = await this.spotExchange.fetchTickers(targetSymbols);
      
      const marketData: MarketData[] = [];
      
      for (const [symbol, ticker] of Object.entries(tickers)) {
        const tickerData = ticker as any; // Type assertion for CCXT ticker
        if (tickerData.last && tickerData.quoteVolume) {
          marketData.push({
            symbol,
            price: tickerData.last,
            volume: tickerData.quoteVolume,
            change24h: tickerData.percentage || 0,
            high24h: tickerData.high || tickerData.last,
            low24h: tickerData.low || tickerData.last,
            timestamp: tickerData.timestamp || Date.now()
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

  // Market-specific OHLCV fetching with proper client routing
  async getOHLCV(symbol: string, timeframe: string = '15m', limit: number = 100, marketType: 'spot' | 'linear' = 'spot'): Promise<OHLCV[]> {
    return await this.fetchWithRetry(symbol, timeframe, limit, marketType);
  }

  // Intelligent batching to avoid CloudFront rate limits
  async getBatchOHLCV(symbols: string[], timeframe: string = '15m', limit: number = 100, marketType: 'spot' | 'linear' = 'spot'): Promise<{ symbol: string; data: OHLCV[] }[]> {
    const results: { symbol: string; data: OHLCV[] }[] = [];
    const batchSize = 8; // Process 8 symbols per batch to stay under rate limits
    const batchDelay = 3000; // 3 second delay between batches
    
    console.log(`🔄 Processing ${symbols.length} symbols in batches of ${batchSize} for ${marketType} market`);
    
    // Split symbols into chunks
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(symbols.length / batchSize)}: ${batch.join(', ')}`);
      
      // Process batch concurrently
      const batchPromises = batch.map(async (symbol) => {
        const data = await this.getOHLCV(symbol, timeframe, limit, marketType);
        return { symbol, data };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Delay between batches to avoid rate limiting
      if (i + batchSize < symbols.length) {
        console.log(`⏳ Waiting ${batchDelay}ms before next batch to avoid rate limits...`);
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }
    
    const successCount = results.filter(r => r.data.length > 0).length;
    console.log(`✅ Batch processing complete: ${successCount}/${symbols.length} symbols retrieved successfully`);
    
    return results;
  }

  // Retry wrapper for transient 403s and network errors
  private async fetchWithRetry(symbol: string, timeframe: string, limit: number, marketType: 'spot' | 'linear', retries = 3): Promise<OHLCV[]> {
    for (let i = 0; i < retries; i++) {
      try {
        // Rate limiting to avoid CloudFront bans
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000)); // 1-2 second random delay
        
        // Use correct exchange client based on market type
        const exchange = marketType === 'spot' ? this.spotExchange : this.linearExchange;
        console.log(`📊 Fetching ${marketType} OHLCV for ${symbol} (attempt ${i + 1}/${retries})`);
        
        const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
        
        if (!ohlcv || ohlcv.length === 0) {
          console.log(`No OHLCV data returned for ${symbol} on ${marketType} market`);
          return [];
        }
        
        console.log(`✅ Successfully fetched ${ohlcv.length} candles for ${symbol} (${marketType})`);
        
        return ohlcv.map(([timestamp, open, high, low, close, volume]) => ({
          timestamp: Number(timestamp),
          open: Number(open),
          high: Number(high),
          low: Number(low),
          close: Number(close),
          volume: Number(volume)
        }));
        
      } catch (error) {
        const isNetworkError = error instanceof Error && (
          error.message.includes('403') || 
          error.message.includes('CloudFront') ||
          error.message.includes('Network') ||
          error.message.includes('timeout')
        );
        
        console.error(`❌ Error fetching OHLCV for ${symbol} (${marketType}) attempt ${i + 1}:`, error instanceof Error ? error.message : 'Unknown error');
        
        if (isNetworkError && i < retries - 1) {
          const backoffTime = Math.pow(2, i) * 2000; // Exponential backoff: 2s, 4s, 8s
          console.log(`⏳ Retrying ${symbol} in ${backoffTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        }
        
        // Final attempt failed or non-network error
        if (i === retries - 1) {
          console.error(`💥 Final attempt failed for ${symbol} (${marketType})`);
          return [];
        }
      }
    }
    return [];
  }

  async getTicker(symbol: string): Promise<MarketData | null> {
    try {
      const ticker = await this.spotExchange.fetchTicker(symbol);
      
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