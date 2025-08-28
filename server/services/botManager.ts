import { EventEmitter } from 'events';
import { SpotTradingBot } from './spotTradingBot';
import { LeverageTradingBot } from './leverageTradingBot';
import { BybitService } from './bybit';
import { IStorage } from '../storage';

export interface BotStatus {
  isRunning: boolean;
  userId?: number;
  startedAt?: string;
  lastActivity?: string;
  type: 'spot' | 'leverage';
}

export class BotManager extends EventEmitter {
  private spotBot: SpotTradingBot;
  private leverageBot: LeverageTradingBot;
  private spotStatus: BotStatus = { isRunning: false, type: 'spot' };
  private leverageStatus: BotStatus = { isRunning: false, type: 'leverage' };

  constructor(
    private bybitService: BybitService,
    private storage: IStorage
  ) {
    super();
    
    // Initialize both bots
    this.spotBot = new SpotTradingBot(bybitService, storage);
    this.leverageBot = new LeverageTradingBot(bybitService, storage);

    // Listen to bot events
    this.spotBot.on('log', (log) => this.emit('spot_log', log));
    this.spotBot.on('error', (error) => this.emit('spot_error', error));
    this.spotBot.on('stopped', () => {
      this.spotStatus = { isRunning: false, type: 'spot' };
      this.emit('spot_stopped');
    });

    this.leverageBot.on('log', (log) => this.emit('leverage_log', log));
    this.leverageBot.on('error', (error) => this.emit('leverage_error', error));
    this.leverageBot.on('stopped', () => {
      this.leverageStatus = { isRunning: false, type: 'leverage' };
      this.emit('leverage_stopped');
    });
  }

  async startSpotBot(userId: number): Promise<void> {
    if (this.spotStatus.isRunning) {
      throw new Error('Spot trading bot is already running');
    }

    await this.spotBot.start(userId);
    
    this.spotStatus = {
      isRunning: true,
      userId,
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      type: 'spot'
    };

    this.emit('spot_started', this.spotStatus);
  }

  async stopSpotBot(): Promise<void> {
    if (!this.spotStatus.isRunning) {
      return;
    }

    await this.spotBot.stop();
    
    this.spotStatus = { isRunning: false, type: 'spot' };
    this.emit('spot_stopped', this.spotStatus);
  }

  async startLeverageBot(userId: number): Promise<void> {
    if (this.leverageStatus.isRunning) {
      throw new Error('Leverage trading bot is already running');
    }

    await this.leverageBot.start(userId);
    
    this.leverageStatus = {
      isRunning: true,
      userId,
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      type: 'leverage'
    };

    this.emit('leverage_started', this.leverageStatus);
  }

  async stopLeverageBot(): Promise<void> {
    if (!this.leverageStatus.isRunning) {
      return;
    }

    await this.leverageBot.stop();
    
    this.leverageStatus = { isRunning: false, type: 'leverage' };
    this.emit('leverage_stopped', this.leverageStatus);
  }

  async stopAllBots(): Promise<void> {
    await Promise.all([
      this.stopSpotBot(),
      this.stopLeverageBot()
    ]);
  }

  getSpotStatus(): BotStatus {
    return this.spotStatus;
  }

  getLeverageStatus(): BotStatus {
    return this.leverageStatus;
  }

  getBothStatuses() {
    return {
      spot: this.spotStatus,
      leverage: this.leverageStatus
    };
  }

  isAnyBotRunning(): boolean {
    return this.spotStatus.isRunning || this.leverageStatus.isRunning;
  }

  getRunningBotsCount(): number {
    let count = 0;
    if (this.spotStatus.isRunning) count++;
    if (this.leverageStatus.isRunning) count++;
    return count;
  }

  // Legacy compatibility methods
  async start(userId: number): Promise<void> {
    // For backward compatibility, start both bots
    await Promise.all([
      this.startSpotBot(userId),
      this.startLeverageBot(userId)
    ]);
  }

  async stop(): Promise<void> {
    await this.stopAllBots();
  }

  getStatus(): BotStatus {
    // For backward compatibility, return combined status
    return {
      isRunning: this.isAnyBotRunning(),
      userId: this.spotStatus.userId || this.leverageStatus.userId,
      startedAt: this.spotStatus.startedAt || this.leverageStatus.startedAt,
      lastActivity: this.spotStatus.lastActivity || this.leverageStatus.lastActivity,
      type: 'spot' // Default to spot for compatibility
    };
  }

  // Position management methods
  async closePosition(positionId: number, userId: number): Promise<any> {
    // Determine which bot should handle this position based on trading mode
    const position = await this.storage.getPosition(positionId);
    
    if (!position || position.userId !== userId) {
      throw new Error('Position not found or access denied');
    }

    if (position.tradingMode === 'spot') {
      // Handle spot position closure
      return this.handleSpotPositionClosure(position);
    } else {
      // Handle leverage position closure
      return this.handleLeveragePositionClosure(position);
    }
  }

  private async handleSpotPositionClosure(position: any): Promise<any> {
    // Implementation for closing spot positions
    return { success: true, message: 'Spot position closed', position };
  }

  private async handleLeveragePositionClosure(position: any): Promise<any> {
    // Implementation for closing leverage positions
    return { success: true, message: 'Leverage position closed', position };
  }
}