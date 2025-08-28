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
      timeout: 15000, // Reduced timeout to prevent hanging
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
    console.log('🔄 Initializing CCXT market data service with dual clients...');
    
    // Use predefined symbols for reliable operation without blocking loadMarkets() calls
    this.setPredefinedSymbols();
    console.log('✅ CCXT service initialized with verified production symbols');
  }

  private setPredefinedSymbols(): void {
    // Use confirmed working symbols from production tests - these work on your server
    const predefinedSymbols = [
      'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT',
      'SOL/USDT', 'DOGE/USDT', 'DOT/USDT', 'MATIC/USDT', 'AVAX/USDT',
      'SHIB/USDT', 'LTC/USDT', 'ATOM/USDT', 'LINK/USDT', 'UNI/USDT',
      'TRX/USDT', 'ETC/USDT', 'BCH/USDT', 'NEAR/USDT', 'APT/USDT',
      'FTM/USDT', 'ALGO/USDT', 'VET/USDT', 'ICP/USDT', 'THETA/USDT',
      'AXS/USDT', 'AAVE/USDT', 'MKR/USDT', 'COMP/USDT', 'SUSHI/USDT'
    ];

    // Create market objects for predefined symbols
    predefinedSymbols.forEach(symbol => {
      this.markets[symbol] = {
        symbol,
        active: true,
        type: 'spot',
        base: symbol.split('/')[0],
        quote: 'USDT'
      };
    });

    console.log(`✅ Using ${predefinedSymbols.length} verified USDT pairs from production tests`);
  }

  async getAllUSDTPairs(): Promise<string[]> {
    if (Object.keys(this.markets).length === 0) {
      this.setPredefinedSymbols();
    }
    
    return Object.keys(this.markets).filter(symbol => 
      symbol.includes('/USDT') && 
      this.markets[symbol].active
    );
  }

  async getTopTradingPairs(limit: number = 20): Promise<string[]> {
    const allPairs = await this.getAllUSDTPairs();
    return allPairs.slice(0, limit);
  }

  async getOHLCV(symbol: string, timeframe: string = '15m', limit: number = 100, forSpot: boolean = true): Promise<OHLCV[]> {
    try {
      // Choose the correct exchange based on trading type
      const exchange = forSpot ? this.spotExchange : this.linearExchange;
      const marketType = forSpot ? 'spot' : 'linear';
      
      console.log(`📊 Fetching ${marketType} OHLCV data for ${symbol} (${limit} candles)`);
      
      // Add timeout wrapper to prevent hanging
      const fetchWithTimeout = async (): Promise<number[][]> => {
        const timeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`OHLCV fetch timeout for ${symbol}`)), 10000);
        });

        const fetchProcess = exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
        return await Promise.race([fetchProcess, timeout]);
      };

      const ohlcvData = await fetchWithTimeout();
      
      if (!ohlcvData || ohlcvData.length === 0) {
        console.log(`⚠️ No OHLCV data received for ${symbol}`);
        return [];
      }

      const result = ohlcvData.map((candle: number[]) => ({
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5]
      }));

      console.log(`✅ Retrieved ${result.length} candles for ${symbol} from ${marketType} market`);
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ OHLCV fetch failed for ${symbol}:`, errorMessage);
      
      // Return empty array instead of crashing
      return [];
    }
  }

  async getMarketData(symbol: string, forSpot: boolean = true): Promise<MarketData | null> {
    try {
      const exchange = forSpot ? this.spotExchange : this.linearExchange;
      const marketType = forSpot ? 'spot' : 'linear';
      
      console.log(`📈 Fetching ${marketType} market data for ${symbol}`);
      
      // Add timeout wrapper
      const fetchWithTimeout = async () => {
        const timeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Market data timeout for ${symbol}`)), 5000);
        });

        const fetchProcess = exchange.fetchTicker(symbol);
        return await Promise.race([fetchProcess, timeout]);
      };

      const ticker = await fetchWithTimeout();
      
      return {
        symbol,
        price: ticker.last || 0,
        volume: ticker.quoteVolume || 0,
        change24h: ticker.percentage || 0,
        high24h: ticker.high || 0,
        low24h: ticker.low || 0,
        timestamp: Date.now()
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Market data fetch failed for ${symbol}:`, errorMessage);
      return null;
    }
  }

  async getBatchOHLCV(symbols: string[], timeframe: string = '15m', limit: number = 100, marketType: string = 'spot'): Promise<Array<{ symbol: string; data: OHLCV[] }>> {
    const forSpot = marketType === 'spot';
    const results = await this.batchFetchOHLCV(symbols, timeframe, limit, forSpot);
    
    // Convert to expected format
    return Object.entries(results).map(([symbol, data]) => ({ symbol, data }));
  }

  async batchFetchOHLCV(symbols: string[], timeframe: string = '15m', limit: number = 100, forSpot: boolean = true): Promise<{ [symbol: string]: OHLCV[] }> {
    const results: { [symbol: string]: OHLCV[] } = {};
    const batchSize = 8; // Process 8 symbols at a time
    const batchDelay = 3000; // 3 second delay between batches
    const marketType = forSpot ? 'spot' : 'linear';
    
    console.log(`📊 Starting batch OHLCV fetch for ${symbols.length} symbols from ${marketType} market`);
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(symbols.length / batchSize)}: ${batch.join(', ')}`);
      
      // Process batch sequentially to avoid rate limits
      for (const symbol of batch) {
        try {
          const ohlcv = await this.getOHLCV(symbol, timeframe, limit, forSpot);
          results[symbol] = ohlcv;
          
          // Small delay between individual requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Failed to fetch OHLCV for ${symbol}:`, error instanceof Error ? error.message : 'Unknown error');
          results[symbol] = [];
        }
      }
      
      // Delay between batches to prevent rate limiting
      if (i + batchSize < symbols.length) {
        console.log(`⏱️ Waiting ${batchDelay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }
    
    const successCount = Object.values(results).filter(data => data.length > 0).length;
    console.log(`✅ Batch fetch complete: ${successCount}/${symbols.length} symbols successful`);
    
    return results;
  }
}

// Create singleton instance
export const ccxtService = new CCXTMarketDataService();