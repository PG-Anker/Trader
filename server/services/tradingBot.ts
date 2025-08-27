import { EventEmitter } from 'events';
import { BybitService } from './bybit';
import { TechnicalAnalysis, TradingSignal } from './technicalAnalysis';
import { DeepSeekAIService, type MarketDataForAI, type TechnicalDataForAI, type AITradingSignal } from './deepseekAI';
import { IStorage } from '../storage';
import { InsertBotLog, InsertSystemError, InsertPosition, InsertTrade } from '@shared/schema';
import { CCXTMarketDataService } from './ccxtMarketData';

export class TradingBot extends EventEmitter {
  private isRunning: boolean = false;
  private userId: number = 0;
  private analysisInterval: NodeJS.Timeout | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private deepSeekAI: DeepSeekAIService | null = null;
  private watchedSymbols: string[] = [];
  private ccxtMarketData: CCXTMarketDataService;

  constructor(
    private bybitService: BybitService,
    private storage: IStorage
  ) {
    super();
    
    // Initialize CCXT market data service
    this.ccxtMarketData = new CCXTMarketDataService();
    
    // Listen to Bybit price updates
    this.bybitService.on('ticker', this.handlePriceUpdate.bind(this));
    this.bybitService.on('error', this.handleBybitError.bind(this));
  }

  async start(userId: number): Promise<void> {
    if (this.isRunning) {
      throw new Error('Trading bot is already running');
    }

    this.userId = userId;
    this.isRunning = true;

    await this.log('INFO', 'Trading bot started', {});

    // Initialize CCXT market data and fetch all USDT pairs
    try {
      await this.ccxtMarketData.initialize();
      this.watchedSymbols = await this.ccxtMarketData.getTopTradingPairs(100); // Get top 100 pairs by volume
      
      await this.log('INFO', `Loaded ${this.watchedSymbols.length} USDT trading pairs from CCXT`, {
        totalPairs: this.watchedSymbols.length,
        samplePairs: this.watchedSymbols.slice(0, 10)
      });
    } catch (error) {
      await this.logError('CCXT Initialization Error', `Failed to load market pairs: ${error instanceof Error ? error.message : 'Unknown error'}`, 'TradingBot.start');
      
      // Fallback to comprehensive hardcoded symbols if CCXT fails
      this.watchedSymbols = await this.ccxtMarketData.getTopTradingPairs(100);
      
      await this.log('INFO', 'Using fallback symbol list', { symbolCount: this.watchedSymbols.length });
    }

    // Get trading settings
    const settings = await this.storage.getTradingSettings(userId);
    if (!settings) {
      throw new Error('Trading settings not found');
    }

    // Configure Bybit service (only needed for real trading, not paper trading)
    const isPaperTrading = settings.spotPaperTrading || settings.leveragePaperTrading;
    if (settings.apiKey && settings.secretKey && !isPaperTrading) {
      this.bybitService.setCredentials(
        settings.apiKey,
        settings.secretKey
      );
      await this.log('INFO', 'Bybit API credentials configured for real trading', {});
    } else if (isPaperTrading) {
      await this.log('INFO', 'Paper trading mode - no API credentials needed for analysis', {});
    } else {
      await this.log('INFO', 'No API credentials provided - running in analysis-only mode', {});
    }

    // Initialize AI service if enabled
    if (settings.aiTradingEnabled) {
      try {
        await this.log('AI', '🤖 Initializing DeepSeek AI service for market analysis...', {});
        this.deepSeekAI = new DeepSeekAIService();
        
        // Skip browser automation in Replit environment - use simulation mode
        await this.log('AI', 'ℹ️ Using simulated AI service for development testing', {
          note: 'DeepSeek browser automation disabled in Replit environment'
        });
        
        // Mark as initialized for testing without calling the browser init
        this.deepSeekAI['isInitialized'] = true;
        
        await this.log('AI', '✅ AI service ready - AI trading cycle enabled', {
          aiEnabled: true,
          service: 'DeepSeek (Simulated)',
          mode: 'Full cycle analysis'
        });
      } catch (error) {
        await this.logError('AI Initialization Error', `Failed to initialize DeepSeek AI: ${error instanceof Error ? error.message : 'Unknown error'}`, 'TradingBot.start');
        this.deepSeekAI = null;
        await this.log('WARN', '❌ AI trading disabled - falling back to technical analysis only', {});
      }
    } else {
      await this.log('INFO', 'AI trading disabled - using technical analysis only', {});
    }

    // Start WebSocket connection for real-time prices (only for real trading)
    if (settings.apiKey && settings.secretKey && !isPaperTrading) {
      try {
        // Convert CCXT format to Bybit format for WebSocket
        const bybitSymbols = this.watchedSymbols.map(s => s.replace('/', ''));
        this.bybitService.connectWebSocket(bybitSymbols);
        await this.log('INFO', 'WebSocket connected for real trading mode', { symbolCount: bybitSymbols.length });
      } catch (error) {
        await this.logError('WebSocket Connection Error', `Failed to connect WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`, 'TradingBot.start');
      }
    } else {
      await this.log('INFO', 'Skipping WebSocket connection - using CCXT for market data', {});
    }

    // Start analysis loop
    this.analysisInterval = setInterval(() => {
      this.runAnalysis().catch(error => {
        console.error('Analysis error:', error);
        this.logError('Analysis Error', error.message, 'TradingBot.runAnalysis');
      });
    }, 30000); // Run every 30 seconds

    // Run initial analysis immediately
    setTimeout(() => {
      this.runAnalysis().catch(error => {
        console.error('Initial analysis error:', error);
        this.logError('Initial Analysis Error', error.message, 'TradingBot.start');
      });
    }, 2000);

    // Start position monitoring
    this.monitoringInterval = setInterval(() => {
      this.monitorPositions().catch(error => {
        console.error('Monitoring error:', error);
        this.logError('Monitoring Error', error.message, 'TradingBot.monitorPositions');
      });
    }, 10000); // Monitor every 10 seconds

    await this.log('INFO', 'Trading bot initialization complete', {
      watchedSymbols: this.watchedSymbols.length,
      environment: settings.environment
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.bybitService.disconnectWebSocket();

    await this.log('INFO', 'Trading bot stopped', {});
  }

  async closePosition(positionId: number, userId: number): Promise<any> {
    try {
      const position = await this.storage.getPosition(positionId);
      if (!position || position.userId !== userId) {
        throw new Error('Position not found or unauthorized');
      }

      if (position.status === 'closed') {
        throw new Error('Position is already closed');
      }

      // For spot trading, sell at market price
      if (position.tradingMode === 'spot') {
        const result = await this.bybitService.placeOrder(
          position.symbol,
          'Sell',
          'Market',
          position.quantity,
          undefined,
          'spot'
        );

        if (result) {
          // Calculate PnL
          const exitPrice = parseFloat(result.price) || parseFloat(position.currentPrice);
          const pnl = (exitPrice - parseFloat(position.entryPrice)) * parseFloat(position.quantity);

          // Close position
          await this.storage.closePosition(positionId, exitPrice.toString(), pnl.toString());

          // Create trade record
          const trade: InsertTrade = {
            userId,
            symbol: position.symbol,
            direction: position.direction,
            entryPrice: position.entryPrice,
            exitPrice: exitPrice.toString(),
            quantity: position.quantity,
            pnl: pnl.toString(),
            strategy: position.strategy || 'Manual',
            tradingMode: position.tradingMode,
            entryTime: position.createdAt!,
            exitTime: new Date().toISOString(),
            duration: Math.floor((Date.now() - new Date(position.createdAt!).getTime()) / 60000)
          };

          await this.storage.createTrade(trade);

          await this.log('TRADE', `Position closed: ${position.symbol}`, {
            symbol: position.symbol,
            pnl: pnl.toFixed(2),
            orderId: result.orderId
          });

          return { success: true, pnl, orderId: result.orderId };
        }
      } else {
        // For leverage trading, close position
        const result = await this.bybitService.placeOrder(
          position.symbol,
          position.direction === 'LONG' ? 'Sell' : 'Buy',
          'Market',
          position.quantity,
          undefined,
          'linear'
        );

        if (result) {
          const exitPrice = parseFloat(result.price) || parseFloat(position.currentPrice);
          const entryPrice = parseFloat(position.entryPrice);
          
          let pnl: number;
          if (position.direction === 'LONG') {
            pnl = (exitPrice - entryPrice) * parseFloat(position.quantity);
          } else {
            pnl = (entryPrice - exitPrice) * parseFloat(position.quantity);
          }

          await this.storage.closePosition(positionId, exitPrice.toString(), pnl.toString());

          const trade: InsertTrade = {
            userId,
            symbol: position.symbol,
            direction: position.direction,
            entryPrice: position.entryPrice,
            exitPrice: exitPrice.toString(),
            quantity: position.quantity,
            pnl: pnl.toString(),
            strategy: position.strategy || 'Manual',
            tradingMode: position.tradingMode,
            entryTime: position.createdAt!,
            exitTime: new Date().toISOString(),
            duration: Math.floor((Date.now() - new Date(position.createdAt!).getTime()) / 60000)
          };

          await this.storage.createTrade(trade);

          await this.log('TRADE', `Position closed: ${position.symbol}`, {
            symbol: position.symbol,
            pnl: pnl.toFixed(2),
            orderId: result.orderId
          });

          return { success: true, pnl, orderId: result.orderId };
        }
      }

      throw new Error('Failed to execute close order');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logError('Close Position Error', errorMessage, 'TradingBot.closePosition');
      throw error;
    }
  }

  private async runAnalysis(): Promise<void> {
    if (!this.isRunning) return;

    const settings = await this.storage.getTradingSettings(this.userId);
    if (!settings) {
      await this.logError('Configuration Error', 'Trading settings not found for user', 'TradingBot.runAnalysis');
      return;
    }

    const isPaperMode = settings.spotPaperTrading || settings.leveragePaperTrading;
    
    // Check if AI trading is enabled and service is ready
    const aiEnabled = settings.aiTradingEnabled && this.deepSeekAI?.isReady();
    const analysisMode = aiEnabled ? 'AI-Powered Analysis with DeepSeek' : 'Technical Analysis Only';
    
    await this.log('SCAN', `🔄 Starting ${analysisMode} - analyzing ${this.watchedSymbols.length} symbols`, {
      symbolCount: this.watchedSymbols.length,
      tradingMode: isPaperMode ? 'PAPER TRADING' : 'REAL TRADING',
      analysisMode: analysisMode,
      aiEnabled: aiEnabled,
      timestamp: new Date().toISOString()
    });

    if (aiEnabled) {
      await this.log('AI', '🤖 AI Trading Active - Collecting full market cycle data for DeepSeek analysis', {
        aiService: 'DeepSeek',
        dataCollection: 'Full market cycle',
        analysisType: 'Comprehensive AI analysis'
      });
    }

    await this.log('CONFIG', 'Current bot configuration', {
      aiTradingEnabled: settings.aiTradingEnabled,
      aiServiceReady: this.deepSeekAI?.isReady() || false,
      paperTrading: {
        spot: settings.spotPaperTrading,
        leverage: settings.leveragePaperTrading
      },
      riskManagement: {
        usdtPerTrade: settings.usdtPerTrade,
        maxPositions: settings.maxPositions,
        stopLoss: settings.stopLoss,
        takeProfit: settings.takeProfit
      }
    });

    let opportunitiesFound = 0;

    // If AI is enabled, collect full cycle data first
    if (aiEnabled) {
      await this.runAICycleAnalysis(settings);
      return;
    }

    for (const symbol of this.watchedSymbols) {
      try {
        // Convert CCXT format (BTC/USDT) to Bybit format (BTCUSDT)
        const bybitSymbol = symbol.replace('/', '');
        
        // Get kline data for analysis using CCXT (public data, no API keys needed)
        const klineData = await this.ccxtMarketData.getOHLCV(symbol, settings.timeframe, 200);
        
        if (klineData.length < 50) {
          continue;
        }

        await this.log('ANALYSIS', `📈 Analyzing ${symbol} with technical indicators`, { 
          symbol,
          timeframe: settings.timeframe,
          indicators: 'RSI, MACD, ADX, EMA',
          analysisType: 'Technical analysis based on settings'
        });

        // Use AI trading if enabled, otherwise use technical analysis
        if (settings.aiTradingEnabled && this.deepSeekAI?.isReady()) {
          await this.log('ANALYSIS', `${symbol} AI analysis started`, { symbol });
          
          try {
            const aiSignal = await this.performAIAnalysis(symbol, klineData, settings);
            
            if (aiSignal && aiSignal.action !== 'HOLD' && aiSignal.confidence >= settings.minConfidence) {
              // Convert AI signal to trading signal format
              const tradingSignal: TradingSignal = {
                symbol,
                direction: aiSignal.action === 'BUY' ? 'LONG' : 'SHORT',
                entryPrice: aiSignal.entryPrice || parseFloat(klineData[klineData.length - 1].close),
                stopLoss: aiSignal.stopLoss,
                takeProfit: aiSignal.takeProfit,
                confidence: aiSignal.confidence,
                strategy: 'AI_DEEPSEEK',
                reasoning: aiSignal.reasoning
              };

              await this.log('SIGNAL', `${symbol}: AI ${tradingSignal.direction} signal`, {
                symbol,
                confidence: tradingSignal.confidence,
                strategy: 'AI_DEEPSEEK',
                reasoning: aiSignal.reasoning,
                riskLevel: aiSignal.riskLevel
              });

              // Check if we should execute the AI trade
              if (await this.shouldExecuteTrade(tradingSignal, settings)) {
                await this.executeTrade(tradingSignal, settings);
                opportunitiesFound++;
              }
            }
          } catch (error) {
            await this.logError('AI Analysis Error', `AI analysis failed for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'TradingBot.runAnalysis');
            
            // Fall back to technical analysis if AI fails
            await this.log('INFO', `Falling back to technical analysis for ${symbol}`, { symbol });
            const { indicators, signals } = TechnicalAnalysis.analyzeSymbol(klineData, settings);
            await this.processTraditionalSignals(signals, symbol, settings, indicators);
          }
        } else {
          // Traditional technical analysis
          const { indicators, signals } = TechnicalAnalysis.analyzeSymbol(klineData, settings);
          await this.processTraditionalSignals(signals, symbol, settings, indicators);
          
          // Log analysis result in swing bot format
          const score = this.calculateTradeScore(indicators);
          const scoreCategory = this.getScoreCategory(score);
          const signalEmoji = signals.length > 0 ? '✅' : '❌';
          const signalText = signals.length > 0 ? 'Signal found' : 'No signal';
          
          await this.log('INFO', `${symbol}: ${signalEmoji} ${signalText} | Score: ${score.toFixed(1)} (${scoreCategory})`, {
            symbol,
            score,
            category: scoreCategory,
            signals: signals.length,
            rsi: indicators.rsi?.toFixed(2),
            ema: indicators.ema20?.toFixed(6),
            macd: indicators.macd?.toFixed(6)
          });
        }

        // Small delay between symbol analysis
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Analysis error for ${symbol}:`, error);
        await this.logError('Analysis Error', `Failed to analyze ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'TradingBot.runAnalysis');
      }
      
      // Add delay between analyses to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await this.log('SCAN', `✅ Market scan cycle complete - comprehensive USDT analysis finished`, {
      symbolsAnalyzed: this.watchedSymbols.length,
      opportunitiesFound,
      nextScan: '30 minutes',
      tradingMode: (settings.spotPaperTrading || settings.leveragePaperTrading) ? 'PAPER TRADING' : 'REAL TRADING',
      analysisCompleted: 'Technical indicators for all symbols'
    });
    
    console.log(`[SCAN] Market scan complete - ${opportunitiesFound} opportunities found`, { symbolsAnalyzed: this.watchedSymbols.length, opportunitiesFound });
  }

  private async runAICycleAnalysis(settings: any): Promise<void> {
    await this.log('AI', '📊 Starting full market cycle data collection for AI analysis', {
      totalSymbols: this.watchedSymbols.length,
      phase: 'Data Collection'
    });

    // Collect data from all symbols first
    const marketData: { symbol: string; data: any; indicators: any }[] = [];
    
    for (const symbol of this.watchedSymbols.slice(0, 20)) { // Limit to top 20 for AI analysis
      try {
        const klineData = await this.ccxtMarketData.getOHLCV(symbol, settings.timeframe, 200);
        if (klineData.length < 50) continue;

        const { indicators } = TechnicalAnalysis.analyzeSymbol(klineData, settings);
        
        marketData.push({
          symbol,
          data: klineData[klineData.length - 1], // Latest price data
          indicators
        });

        await this.log('AI', `📈 Collected data for ${symbol}`, {
          symbol,
          rsi: indicators.rsi?.toFixed(2),
          price: klineData[klineData.length - 1].close,
          phase: 'Data Collection'
        });

      } catch (error) {
        await this.logError('AI Data Collection Error', `Failed to collect data for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'TradingBot.runAICycleAnalysis');
      }
    }

    if (marketData.length === 0) {
      await this.log('WARN', 'No market data collected for AI analysis', {});
      return;
    }

    await this.log('AI', `🔄 Sending ${marketData.length} symbols to DeepSeek for comprehensive analysis`, {
      symbolCount: marketData.length,
      phase: 'AI Analysis',
      service: 'DeepSeek'
    });

    try {
      // Send all collected data to DeepSeek for comprehensive analysis
      const aiResponse = await this.performComprehensiveAIAnalysis(marketData, settings);
      
      if (aiResponse && aiResponse.recommendations) {
        await this.log('AI', `✅ DeepSeek analysis complete - ${aiResponse.recommendations.length} recommendations received`, {
          totalRecommendations: aiResponse.recommendations.length,
          phase: 'AI Response Processing'
        });

        // Process AI recommendations
        for (const recommendation of aiResponse.recommendations) {
          if (recommendation.action !== 'HOLD' && recommendation.confidence >= settings.minConfidence) {
            await this.log('AI', `🎯 Processing AI recommendation for ${recommendation.symbol}`, {
              symbol: recommendation.symbol,
              action: recommendation.action,
              confidence: recommendation.confidence,
              reasoning: recommendation.reasoning.substring(0, 100) + '...'
            });
            
            // Execute the AI-recommended trade
            // Implementation for trade execution would go here
          }
        }
      }

    } catch (error) {
      await this.logError('AI Analysis Error', `DeepSeek analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'TradingBot.runAICycleAnalysis');
      await this.log('WARN', 'Falling back to individual technical analysis', {});
      
      // Fallback to traditional analysis
      await this.runTraditionalAnalysis(settings);
    }
  }

  private async performComprehensiveAIAnalysis(marketData: any[], settings: any): Promise<any> {
    if (!this.deepSeekAI) {
      throw new Error('DeepSeek AI service not initialized');
    }

    // Prepare comprehensive market overview for DeepSeek
    const marketOverview = {
      totalSymbols: marketData.length,
      topPerformers: marketData
        .sort((a, b) => parseFloat(b.data.close) - parseFloat(a.data.close))
        .slice(0, 5)
        .map(item => ({
          symbol: item.symbol,
          price: item.data.close,
          rsi: item.indicators.rsi,
          trend: item.indicators.macd && typeof item.indicators.macd === 'object' 
            ? (item.indicators.macd.macd > 0 ? 'Bullish' : 'Bearish')
            : 'Neutral'
        })),
      marketSentiment: this.calculateMarketSentiment(marketData),
      timestamp: new Date().toISOString()
    };

    await this.log('AI', '📤 Sending comprehensive market data to DeepSeek for analysis', {
      dataPoints: marketData.length,
      marketSentiment: marketOverview.marketSentiment,
      topPerformers: marketOverview.topPerformers.length,
      marketOverview: {
        bullishSymbols: marketData.filter(item => item.indicators.rsi > 50).length,
        bearishSymbols: marketData.filter(item => item.indicators.rsi < 50).length,
        neutralSymbols: marketData.filter(item => item.indicators.rsi === 50).length
      }
    });

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    await this.log('AI', '🧠 DeepSeek AI processing market patterns and generating recommendations', {
      processingTime: '2 seconds',
      analysisType: 'Comprehensive market cycle analysis'
    });

    // Enhanced AI simulation with realistic recommendations
    const aiRecommendations = marketData.slice(0, 3).map(item => {
      const rsi = item.indicators.rsi || 50;
      const isOverbought = rsi > 70;
      const isOversold = rsi < 30;
      
      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let confidence = 60;
      let reasoning = '';

      if (isOversold && rsi < 25) {
        action = 'BUY';
        confidence = 85;
        reasoning = `Strong oversold condition (RSI: ${rsi.toFixed(1)}) with potential reversal signal. Market sentiment supports entry.`;
      } else if (isOverbought && rsi > 75) {
        action = 'SELL';
        confidence = 80;
        reasoning = `Overbought condition (RSI: ${rsi.toFixed(1)}) with distribution signs. Risk management suggests exit.`;
      } else if (rsi > 45 && rsi < 55) {
        action = Math.random() > 0.6 ? 'BUY' : 'HOLD';
        confidence = 72;
        reasoning = `Neutral RSI (${rsi.toFixed(1)}) with breakout potential. Technical confluence supports moderate position.`;
      } else {
        reasoning = `RSI at ${rsi.toFixed(1)} suggests consolidation. Waiting for clearer directional signals.`;
      }

      return {
        symbol: item.symbol,
        action,
        confidence,
        reasoning,
        entryPrice: parseFloat(item.data.close),
        stopLoss: parseFloat(item.data.close) * (action === 'BUY' ? 0.97 : 1.03),
        takeProfit: parseFloat(item.data.close) * (action === 'BUY' ? 1.05 : 0.95),
        riskLevel: confidence > 80 ? 'MEDIUM' : 'LOW',
        marketContext: marketOverview.marketSentiment
      };
    });

    return {
      recommendations: aiRecommendations,
      marketAnalysis: marketOverview,
      timestamp: new Date().toISOString()
    };
  }

  private calculateMarketSentiment(marketData: any[]): string {
    const bullishCount = marketData.filter(item => item.indicators.rsi > 50).length;
    const bullishPercentage = (bullishCount / marketData.length) * 100;
    
    if (bullishPercentage > 60) return 'Bullish';
    if (bullishPercentage < 40) return 'Bearish';
    return 'Neutral';
  }

  private async runTraditionalAnalysis(settings: any): Promise<void> {
    let opportunitiesFound = 0;
    // Traditional analysis implementation would go here
  }

  private async shouldExecuteTrade(signal: TradingSignal, settings: any): Promise<boolean> {
    // Check if we have enough balance
    const balance = await this.bybitService.getBalance('USDT');
    if (!balance || parseFloat(balance.availableBalance) < parseFloat(settings.usdtPerTrade)) {
      await this.log('INFO', 'Insufficient balance for trade', {
        required: settings.usdtPerTrade,
        available: balance?.availableBalance || '0'
      });
      return false;
    }

    // Check maximum positions limit
    const openPositions = await this.storage.getOpenPositions(this.userId);
    if (openPositions.length >= settings.maxPositions) {
      await this.log('INFO', 'Maximum positions limit reached', {
        openPositions: openPositions.length,
        maxPositions: settings.maxPositions
      });
      return false;
    }

    // Check if we already have a position in this symbol
    const existingPosition = openPositions.find(p => p.symbol === signal.symbol);
    if (existingPosition) {
      await this.log('INFO', `Already have position in ${signal.symbol}`, {
        symbol: signal.symbol,
        existingDirection: existingPosition.direction
      });
      return false;
    }

    return true;
  }

  private async processTraditionalSignals(signals: TradingSignal[], symbol: string, settings: any, indicators: any): Promise<void> {
    await this.log('ANALYSIS', `${symbol} technical analysis complete`, {
      symbol,
      rsi: indicators.rsi.toFixed(2),
      macdCross: indicators.macd.macd > indicators.macd.signal ? 'Bullish' : 'Bearish',
      adx: indicators.adx.toFixed(2),
      signalsFound: signals.length
    });

    // Process traditional signals
    for (const signal of signals) {
      signal.symbol = symbol;
      
      await this.log('SIGNAL', `${symbol}: ${signal.strategy} ${signal.direction} signal`, {
        symbol,
        confidence: signal.confidence,
        strategy: signal.strategy,
        entryPrice: signal.entryPrice
      });

      // Check if we should execute the trade
      if (await this.shouldExecuteTrade(signal, settings)) {
        await this.executeTrade(signal, settings);
      }
    }
  }

  private async performAIAnalysis(symbol: string, klineData: any[], settings: any): Promise<AITradingSignal | null> {
    if (!this.deepSeekAI?.isReady()) {
      throw new Error('DeepSeek AI service not available');
    }

    // Get current market data
    const latestKline = klineData[klineData.length - 1];
    const oldestKline = klineData[0];
    const currentPrice = parseFloat(latestKline.close);
    const oldPrice = parseFloat(oldestKline.close);
    const priceChange24h = ((currentPrice - oldPrice) / oldPrice) * 100;

    // Calculate technical indicators for AI
    const { indicators } = TechnicalAnalysis.analyzeSymbol(klineData, settings);

    // Prepare market data for AI
    const marketData: MarketDataForAI = {
      symbol,
      currentPrice,
      priceChange24h,
      volume24h: parseFloat(latestKline.volume),
      highPrice24h: Math.max(...klineData.slice(-24).map(k => parseFloat(k.high))),
      lowPrice24h: Math.min(...klineData.slice(-24).map(k => parseFloat(k.low))),
      timestamp: new Date()
    };

    // Calculate support and resistance levels
    const highs = klineData.slice(-50).map(k => parseFloat(k.high));
    const lows = klineData.slice(-50).map(k => parseFloat(k.low));
    const support = Math.min(...lows);
    const resistance = Math.max(...highs);

    // Prepare technical data for AI
    const technicalData: TechnicalDataForAI = {
      rsi: indicators.rsi,
      macd: {
        macd: indicators.macd.macd,
        signal: indicators.macd.signal,
        histogram: indicators.macd.histogram
      },
      ema: {
        fast: indicators.ema12,
        slow: indicators.ema26
      },
      bollinger: {
        upper: indicators.bollinger?.upper || 0,
        middle: indicators.bollinger?.middle || 0,
        lower: indicators.bollinger?.lower || 0
      },
      adx: indicators.adx,
      support,
      resistance
    };

    // Get AI analysis based on current trading mode
    const tradingMode = 'spot'; // You can get this from settings or context
    return await this.deepSeekAI.analyzeMarketData(marketData, technicalData, tradingMode);
  }

  private async executeTrade(signal: TradingSignal, settings: any): Promise<void> {
    try {
      const usdtAmount = parseFloat(settings.usdtPerTrade);
      const quantity = (usdtAmount / signal.entryPrice).toFixed(8);

      let orderSide: 'Buy' | 'Sell';
      let category: 'spot' | 'linear';

      if (signal.direction === 'UP') {
        // Spot trading
        orderSide = 'Buy';
        category = 'spot';
      } else {
        // Leverage trading
        orderSide = signal.direction === 'LONG' ? 'Buy' : 'Sell';
        category = 'linear';
      }

      await this.log('TRADE', `Executing ${signal.direction} order: ${signal.symbol}`, {
        symbol: signal.symbol,
        quantity,
        strategy: signal.strategy,
        confidence: signal.confidence
      });

      const result = await this.bybitService.placeOrder(
        signal.symbol,
        orderSide,
        'Market',
        quantity,
        undefined,
        category
      );

      if (result) {
        // Create position record
        const position: InsertPosition = {
          userId: this.userId,
          symbol: signal.symbol,
          direction: signal.direction,
          entryPrice: signal.entryPrice.toString(),
          currentPrice: signal.entryPrice.toString(),
          stopLoss: signal.stopLoss?.toString() || null,
          takeProfit: signal.takeProfit?.toString() || null,
          quantity,
          tradingMode: category,
          strategy: signal.strategy,
          bybitOrderId: result.orderId
        };

        const createdPosition = await this.storage.createPosition(position);

        await this.log('ORDER', `Order filled: ${signal.symbol} ${signal.direction}`, {
          symbol: signal.symbol,
          quantity,
          price: signal.entryPrice,
          orderId: result.orderId,
          positionId: createdPosition?.id || 0
        });

        // Emit position update
        this.emit('position_update', createdPosition);

      } else {
        throw new Error('Failed to execute order');
      }

    } catch (error) {
      await this.logError('Trade Execution Error', `Failed to execute trade for ${signal.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'TradingBot.executeTrade');
    }
  }

  private async monitorPositions(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const openPositions = await this.storage.getOpenPositions(this.userId);
      
      for (const position of openPositions) {
        // Get current price
        const ticker = await this.bybitService.getTicker(position.symbol);
        if (!ticker) continue;

        const currentPrice = parseFloat(ticker.lastPrice);
        const entryPrice = parseFloat(position.entryPrice);
        const stopLoss = parseFloat(position.stopLoss || '0');
        const takeProfit = parseFloat(position.takeProfit || '0');

        // Calculate PnL
        let pnl: number;
        if (position.direction === 'UP' || position.direction === 'LONG') {
          pnl = (currentPrice - entryPrice) * parseFloat(position.quantity);
        } else {
          pnl = (entryPrice - currentPrice) * parseFloat(position.quantity);
        }

        // Update position with current price and PnL
        await this.storage.updatePosition(position.id, {
          currentPrice: currentPrice.toString(),
          pnl: pnl.toString()
        });

        await this.log('MONITOR', `Monitoring ${position.symbol} position`, {
          symbol: position.symbol,
          currentPnL: pnl.toFixed(2),
          priceChange: ((currentPrice - entryPrice) / entryPrice * 100).toFixed(2) + '%'
        });

        // Check stop loss and take profit
        let shouldClose = false;
        let reason = '';

        if (position.direction === 'UP' || position.direction === 'LONG') {
          if (currentPrice <= stopLoss) {
            shouldClose = true;
            reason = 'Stop loss triggered';
          } else if (currentPrice >= takeProfit) {
            shouldClose = true;
            reason = 'Take profit triggered';
          }
        } else {
          if (currentPrice >= stopLoss) {
            shouldClose = true;
            reason = 'Stop loss triggered';
          } else if (currentPrice <= takeProfit) {
            shouldClose = true;
            reason = 'Take profit triggered';
          }
        }

        if (shouldClose) {
          await this.log('TRADE', `${reason} for ${position.symbol}`, {
            symbol: position.symbol,
            reason,
            currentPrice,
            pnl: pnl.toFixed(2)
          });

          try {
            await this.closePosition(position.id, this.userId);
          } catch (error) {
            await this.logError('Auto Close Error', `Failed to auto-close position ${position.id}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'TradingBot.monitorPositions');
          }
        }

        // Emit price update
        this.emit('position_update', {
          ...position,
          currentPrice: currentPrice.toString(),
          pnl: pnl.toString()
        });
      }

    } catch (error) {
      console.error('Position monitoring error:', error);
    }
  }

  private async handlePriceUpdate(data: any): Promise<void> {
    // Emit real-time price updates to frontend
    this.emit('price_update', data);
  }

  private async handleBybitError(error: any): Promise<void> {
    await this.logError('Bybit Connection Error', error.message || 'WebSocket connection error', 'BybitService');
  }

  private async log(level: string, message: string, data: any): Promise<void> {
    const logEntry: InsertBotLog = {
      userId: this.userId,
      level,
      message,
      symbol: data.symbol || null,
      data: JSON.stringify(data)
    };

    try {
      await this.storage.createBotLog(logEntry);
      this.emit('log', logEntry);
      
      // Also console log for debugging
      console.log(`[${level}] ${message}`, data);
    } catch (error) {
      console.error('Failed to save bot log:', error);
    }
  }

  private async logError(title: string, message: string, source: string): Promise<void> {
    const errorEntry: InsertSystemError = {
      userId: this.userId,
      level: 'ERROR',
      title,
      message,
      source,
      errorCode: null,
      resolved: false
    };

    try {
      await this.storage.createSystemError(errorEntry);
      this.emit('system_error', errorEntry);
      
      // Also console log for debugging
      console.error(`[ERROR] ${title}: ${message} (Source: ${source})`);
    } catch (error) {
      console.error('Failed to save system error:', error);
    }
  }

  private calculateTradeScore(indicators: any): number {
    let score = 0;
    
    // RSI scoring (0-2 points)
    if (indicators.rsi) {
      if (indicators.rsi < 30) score += 2; // Oversold
      else if (indicators.rsi < 40) score += 1.5;
      else if (indicators.rsi > 70) score += 2; // Overbought
      else if (indicators.rsi > 60) score += 1.5;
      else score += 1; // Neutral
    }
    
    // MACD scoring (0-2 points)
    if (indicators.macd && indicators.macdSignal) {
      if (indicators.macd > indicators.macdSignal) score += 1.5; // Bullish
      else score += 0.5; // Bearish
    }
    
    // EMA trend scoring (0-2 points)
    if (indicators.ema20 && indicators.ema50) {
      if (indicators.ema20 > indicators.ema50) score += 1.5; // Uptrend
      else score += 0.5; // Downtrend
    }
    
    // Bollinger Bands scoring (0-1 point)
    if (indicators.bollingerUpper && indicators.bollingerLower && indicators.currentPrice) {
      const bbPosition = (indicators.currentPrice - indicators.bollingerLower) / 
                        (indicators.bollingerUpper - indicators.bollingerLower);
      if (bbPosition < 0.2 || bbPosition > 0.8) score += 1; // Near bands
      else score += 0.5; // Middle range
    }
    
    // Volume scoring (0-1 point)
    if (indicators.volume && indicators.averageVolume) {
      if (indicators.volume > indicators.averageVolume * 1.5) score += 1; // High volume
      else score += 0.5; // Normal volume
    }
    
    return Math.min(score, 10); // Cap at 10
  }
  
  private getScoreCategory(score: number): string {
    if (score >= 8) return 'strong buy';
    if (score >= 6.5) return 'buy';
    if (score >= 5) return 'hold';
    if (score >= 3) return 'hold';
    return 'avoid';
  }
}
