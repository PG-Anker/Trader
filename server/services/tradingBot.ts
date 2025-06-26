import { EventEmitter } from 'events';
import { BybitService } from './bybit';
import { TechnicalAnalysis, TradingSignal } from './technicalAnalysis';
import { IStorage } from '../storage';
import { InsertBotLog, InsertSystemError, InsertPosition, InsertTrade } from '@shared/schema';

export class TradingBot extends EventEmitter {
  private isRunning: boolean = false;
  private userId: number = 0;
  private analysisInterval: NodeJS.Timeout | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private watchedSymbols: string[] = [
    'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT', 
    'MATICUSDT', 'LINKUSDT', 'AVAXUSDT', 'UNIUSDT', 'LTCUSDT'
  ];

  constructor(
    private bybitService: BybitService,
    private storage: IStorage
  ) {
    super();
    
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

    // Get trading settings
    const settings = await this.storage.getTradingSettings(userId);
    if (!settings) {
      throw new Error('Trading settings not found');
    }

    // Configure Bybit service
    if (settings.apiKey && settings.secretKey) {
      this.bybitService.setCredentials(
        settings.apiKey,
        settings.secretKey,
        settings.environment === 'mainnet'
      );
    }

    // Start WebSocket connection for real-time prices
    this.bybitService.connectWebSocket(this.watchedSymbols);

    // Start analysis loop
    this.analysisInterval = setInterval(() => {
      this.runAnalysis().catch(error => {
        console.error('Analysis error:', error);
        this.logError('Analysis Error', error.message, 'TradingBot.runAnalysis');
      });
    }, 30000); // Run every 30 seconds

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
            exitTime: new Date(),
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
            exitTime: new Date(),
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
      await this.logError('Close Position Error', error instanceof Error ? error.message : 'Unknown error', 'TradingBot.closePosition');
      throw error;
    }
  }

  private async runAnalysis(): Promise<void> {
    if (!this.isRunning) return;

    await this.log('SCAN', `Market scan started - analyzing ${this.watchedSymbols.length} symbols`, {});

    const settings = await this.storage.getTradingSettings(this.userId);
    if (!settings) return;

    let opportunitiesFound = 0;

    for (const symbol of this.watchedSymbols) {
      try {
        // Get kline data for analysis
        const klineData = await this.bybitService.getKlines(symbol, settings.timeframe, 200);
        
        if (klineData.length < 50) {
          continue;
        }

        await this.log('ANALYSIS', `Analyzing ${symbol}`, {
          symbol,
          timeframe: settings.timeframe,
          dataPoints: klineData.length
        });

        // Perform technical analysis
        const { indicators, signals } = TechnicalAnalysis.analyzeSymbol(klineData, settings);

        await this.log('ANALYSIS', `${symbol} analysis complete`, {
          symbol,
          rsi: indicators.rsi.toFixed(2),
          macdCross: indicators.macd.macd > indicators.macd.signal ? 'Bullish' : 'Bearish',
          adx: indicators.adx.toFixed(2),
          signalsFound: signals.length
        });

        // Process signals
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
            opportunitiesFound++;
          }
        }

        // Small delay between symbol analysis
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Analysis error for ${symbol}:`, error);
        await this.logError('Analysis Error', `Failed to analyze ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'TradingBot.runAnalysis');
      }
    }

    await this.log('SCAN', `Market scan complete - ${opportunitiesFound} opportunities found`, {
      symbolsAnalyzed: this.watchedSymbols.length,
      opportunitiesFound
    });
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
          stopLoss: signal.stopLoss.toString(),
          takeProfit: signal.takeProfit.toString(),
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
          positionId: createdPosition.id
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
        const stopLoss = parseFloat(position.stopLoss);
        const takeProfit = parseFloat(position.takeProfit);

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
      data
    };

    await this.storage.createBotLog(logEntry);
    this.emit('log', logEntry);
  }

  private async logError(title: string, message: string, source: string): Promise<void> {
    const errorEntry: InsertSystemError = {
      userId: this.userId,
      level: 'ERROR',
      title,
      message,
      source
    };

    await this.storage.createSystemError(errorEntry);
    this.emit('error', errorEntry);
  }
}
