import { ccxtService } from './ccxtMarketData';
import { IStorage } from '../storage';

/**
 * Position Monitor Service - Tracks live prices for all paper trades
 * Runs independently of bot status to ensure continuous price updates
 */
export class PositionMonitorService {
  private storage: IStorage;
  private isRunning = false;
  private monitorInterval?: NodeJS.Timeout;
  private readonly UPDATE_INTERVAL = 30000; // 30 seconds

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('📊 Position monitor already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting position monitor service for live price tracking');

    // Start immediate monitoring
    await this.updateAllPositions();

    // Set up periodic updates
    this.monitorInterval = setInterval(async () => {
      await this.updateAllPositions();
    }, this.UPDATE_INTERVAL);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }
    console.log('⏹️ Position monitor service stopped');
  }

  private async updateAllPositions(): Promise<void> {
    try {
      // Get all open positions (both paper and real trades)
      const openPositions = await this.storage.getAllOpenPositions();
      
      if (openPositions.length === 0) {
        return;
      }

      console.log(`📈 Updating live prices for ${openPositions.length} open positions`);

      // Group positions by symbol to minimize API calls
      const symbolGroups: Record<string, any[]> = {};
      for (const position of openPositions) {
        if (!symbolGroups[position.symbol]) {
          symbolGroups[position.symbol] = [];
        }
        symbolGroups[position.symbol].push(position);
      }

      // Update prices for each symbol
      for (const [symbol, positions] of Object.entries(symbolGroups)) {
        await this.updateSymbolPositions(symbol, positions);
      }

      console.log(`✅ Live price updates complete for ${Object.keys(symbolGroups).length} symbols`);

    } catch (error) {
      console.error('❌ Position monitor error:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async updateSymbolPositions(symbol: string, positions: any[]): Promise<void> {
    try {
      // Get current market data for both spot and linear markets
      const [spotData, linearData] = await Promise.all([
        ccxtService.getOHLCV(symbol, '1m', 1, true).catch(() => []),
        ccxtService.getOHLCV(symbol, '1m', 1, false).catch(() => [])
      ]);

      // Use the most recent candle for current price
      let currentPrice: number | null = null;

      if (spotData.length > 0) {
        currentPrice = spotData[0].close;
      } else if (linearData.length > 0) {
        currentPrice = linearData[0].close;
      }

      if (!currentPrice) {
        console.warn(`⚠️ No price data available for ${symbol}`);
        return;
      }

      // Update all positions for this symbol
      for (const position of positions) {
        await this.updatePosition(position, currentPrice);
      }

    } catch (error) {
      console.error(`❌ Failed to update ${symbol} positions:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async updatePosition(position: any, currentPrice: number): Promise<void> {
    try {
      const entryPrice = parseFloat(position.entryPrice);
      const quantity = parseFloat(position.quantity);
      const stopLoss = parseFloat(position.stopLoss || '0');
      const takeProfit = parseFloat(position.takeProfit || '0');

      // Calculate PnL based on direction
      let pnl: number;
      if (position.direction === 'UP' || position.direction === 'LONG') {
        pnl = (currentPrice - entryPrice) * quantity;
      } else {
        pnl = (entryPrice - currentPrice) * quantity;
      }

      // Update position with current price and PnL
      await this.storage.updatePosition(position.id, {
        currentPrice: currentPrice.toString(),
        pnl: pnl.toString()
      });

      // Check for auto-exit conditions (stop loss / take profit)
      await this.checkExitConditions(position, currentPrice, stopLoss, takeProfit, pnl);

    } catch (error) {
      console.error(`❌ Failed to update position ${position.id}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async checkExitConditions(
    position: any, 
    currentPrice: number, 
    stopLoss: number, 
    takeProfit: number, 
    pnl: number
  ): Promise<void> {
    if (!position.isPaperTrade) {
      return; // Only auto-exit paper trades
    }

    let shouldClose = false;
    let reason = '';

    if (position.direction === 'UP' || position.direction === 'LONG') {
      if (stopLoss > 0 && currentPrice <= stopLoss) {
        shouldClose = true;
        reason = 'Stop loss triggered';
      } else if (takeProfit > 0 && currentPrice >= takeProfit) {
        shouldClose = true;
        reason = 'Take profit triggered';
      }
    } else {
      if (stopLoss > 0 && currentPrice >= stopLoss) {
        shouldClose = true;
        reason = 'Stop loss triggered';
      } else if (takeProfit > 0 && currentPrice <= takeProfit) {
        shouldClose = true;
        reason = 'Take profit triggered';
      }
    }

    if (shouldClose) {
      await this.closePaperPosition(position, reason, currentPrice, pnl);
    }
  }

  private async closePaperPosition(position: any, reason: string, exitPrice: number, pnl: number): Promise<void> {
    try {
      // Close the position
      await this.storage.updatePosition(position.id, {
        status: 'closed',
        currentPrice: exitPrice.toString(),
        pnl: pnl.toString()
      });

      // Create trade record
      await this.storage.createTrade({
        userId: position.userId,
        symbol: position.symbol,
        direction: position.direction,
        entryPrice: position.entryPrice,
        exitPrice: exitPrice.toString(),
        quantity: position.quantity,
        pnl: pnl.toString(),
        strategy: position.strategy || 'auto_exit',
        tradingMode: position.tradingMode,
        isPaperTrade: true,
        entryTime: position.createdAt,
        exitTime: new Date().toISOString(),
        duration: Math.floor((Date.now() - new Date(position.createdAt).getTime()) / 1000)
      });

      console.log(`🎯 Paper trade auto-closed: ${position.symbol} ${position.direction} - ${reason} - PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);

    } catch (error) {
      console.error(`❌ Failed to close paper position ${position.id}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  getStatus(): { isRunning: boolean; updateInterval: number } {
    return {
      isRunning: this.isRunning,
      updateInterval: this.UPDATE_INTERVAL
    };
  }
}

// Singleton will be created in server/index.ts after storage is initialized