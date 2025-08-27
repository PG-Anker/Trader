import { 
  users, 
  tradingSettings, 
  positions, 
  trades, 
  botLogs, 
  systemErrors, 
  marketData,
  type User, 
  type InsertUser,
  type TradingSettings,
  type InsertTradingSettings,
  type Position,
  type InsertPosition,
  type Trade,
  type InsertTrade,
  type BotLog,
  type InsertBotLog,
  type SystemError,
  type InsertSystemError,
  type MarketData,
  type InsertMarketData
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count, sum, avg } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Trading settings operations
  getTradingSettings(userId: number): Promise<TradingSettings | undefined>;
  updateTradingSettings(userId: number, settings: Partial<InsertTradingSettings>): Promise<TradingSettings>;

  // Position operations
  getPosition(id: number): Promise<Position | undefined>;
  getOpenPositions(userId: number, isPaperTrade?: boolean): Promise<Position[]>;
  createPosition(position: InsertPosition): Promise<Position>;
  updatePosition(id: number, updates: Partial<Position>): Promise<Position>;
  closePosition(id: number, exitPrice: string, pnl: string): Promise<Position>;

  // Trade operations
  createTrade(trade: InsertTrade): Promise<Trade>;
  getTradeHistory(userId: number, isPaperTrade?: boolean, limit?: number): Promise<Trade[]>;

  // Bot log operations
  createBotLog(log: InsertBotLog): Promise<BotLog>;
  getBotLogs(userId: number, limit?: number): Promise<BotLog[]>;
  clearBotLogs(userId: number): Promise<void>;

  // System error operations
  createSystemError(error: InsertSystemError): Promise<SystemError>;
  getSystemErrors(userId: number, limit?: number): Promise<SystemError[]>;
  resolveSystemError(id: number): Promise<SystemError>;

  // Market data operations
  updateMarketData(data: InsertMarketData): Promise<MarketData>;
  getMarketData(symbol: string): Promise<MarketData | undefined>;

  // Dashboard data
  getTradingStats(userId: number, isPaperTrade?: boolean): Promise<any>;
  getTradingSummary(userId: number, isPaperTrade?: boolean): Promise<any>;
  getTradingOpportunities(): Promise<any[]>;
  getStrategyPerformance(userId: number, isPaperTrade?: boolean): Promise<any[]>;
  getPortfolioData(userId: number, isPaperTrade?: boolean): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getTradingSettings(userId: number): Promise<TradingSettings | undefined> {
    const [settings] = await db
      .select()
      .from(tradingSettings)
      .where(eq(tradingSettings.userId, userId))
      .limit(1);
    
    if (!settings) {
      // Create default settings for user
      const defaultSettings: InsertTradingSettings = {
        userId,
        usdtPerTrade: "100",
        maxPositions: 10,
        riskPerTrade: "2.5",
        stopLoss: "3.0",
        takeProfit: "6.0",
        environment: "mainnet",
        rsiPeriod: 14,
        rsiLow: 30,
        rsiHigh: 70,
        emaFast: 12,
        emaSlow: 26,
        macdSignal: 9,
        adxPeriod: 14,
        strategies: '{"trendFollowing": true, "meanReversion": true, "breakoutTrading": false, "pullbackTrading": true}',
        timeframe: "15m",
        minConfidence: 75
      };
      
      const [newSettings] = await db
        .insert(tradingSettings)
        .values(defaultSettings)
        .returning();
      
      return newSettings;
    }
    
    return settings;
  }

  async updateTradingSettings(userId: number, updates: Partial<InsertTradingSettings>): Promise<TradingSettings> {
    const [settings] = await db
      .update(tradingSettings)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(tradingSettings.userId, userId))
      .returning();
    
    return settings;
  }

  async getPosition(id: number): Promise<Position | undefined> {
    const [position] = await db.select().from(positions).where(eq(positions.id, id));
    return position || undefined;
  }

  async getOpenPositions(userId: number, isPaperTrade?: boolean): Promise<Position[]> {
    const conditions = [
      eq(positions.userId, userId),
      eq(positions.status, 'open')
    ];
    
    if (isPaperTrade !== undefined) {
      conditions.push(eq(positions.isPaperTrade, isPaperTrade));
    }
    
    return await db
      .select()
      .from(positions)
      .where(and(...conditions))
      .orderBy(desc(positions.createdAt));
  }

  async createPosition(position: InsertPosition): Promise<Position> {
    const [newPosition] = await db
      .insert(positions)
      .values(position)
      .returning();
    return newPosition;
  }

  async updatePosition(id: number, updates: Partial<Position>): Promise<Position> {
    const [position] = await db
      .update(positions)
      .set(updates)
      .where(eq(positions.id, id))
      .returning();
    return position;
  }

  async closePosition(id: number, exitPrice: string, pnl: string): Promise<Position> {
    const [position] = await db
      .update(positions)
      .set({
        status: 'closed',
        currentPrice: exitPrice,
        pnl,
        closedAt: new Date().toISOString()
      })
      .where(eq(positions.id, id))
      .returning();
    return position;
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const [newTrade] = await db
      .insert(trades)
      .values(trade)
      .returning();
    return newTrade;
  }

  async getTradeHistory(userId: number, isPaperTrade?: boolean, limit: number = 50): Promise<Trade[]> {
    const conditions = [eq(trades.userId, userId)];
    
    if (isPaperTrade !== undefined) {
      conditions.push(eq(trades.isPaperTrade, isPaperTrade));
    }
    
    return await db
      .select()
      .from(trades)
      .where(and(...conditions))
      .orderBy(desc(trades.exitTime))
      .limit(limit);
  }

  async createBotLog(log: InsertBotLog): Promise<BotLog> {
    const [newLog] = await db
      .insert(botLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getBotLogs(userId: number, limit: number = 100): Promise<BotLog[]> {
    return await db
      .select()
      .from(botLogs)
      .where(eq(botLogs.userId, userId))
      .orderBy(desc(botLogs.createdAt))
      .limit(limit);
  }

  async clearBotLogs(userId: number): Promise<void> {
    await db
      .delete(botLogs)
      .where(eq(botLogs.userId, userId));
  }

  async createSystemError(error: InsertSystemError): Promise<SystemError> {
    const [newError] = await db
      .insert(systemErrors)
      .values(error)
      .returning();
    return newError;
  }

  async getSystemErrors(userId: number, limit: number = 50): Promise<SystemError[]> {
    return await db
      .select()
      .from(systemErrors)
      .where(eq(systemErrors.userId, userId))
      .orderBy(desc(systemErrors.createdAt))
      .limit(limit);
  }

  async resolveSystemError(id: number): Promise<SystemError> {
    const [error] = await db
      .update(systemErrors)
      .set({ resolved: true })
      .where(eq(systemErrors.id, id))
      .returning();
    return error;
  }

  async updateMarketData(data: InsertMarketData): Promise<MarketData> {
    const [existing] = await db
      .select()
      .from(marketData)
      .where(eq(marketData.symbol, data.symbol))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(marketData)
        .set(data)
        .where(eq(marketData.symbol, data.symbol))
        .returning();
      return updated;
    } else {
      const [newData] = await db
        .insert(marketData)
        .values(data)
        .returning();
      return newData;
    }
  }

  async getMarketData(symbol: string): Promise<MarketData | undefined> {
    const [data] = await db
      .select()
      .from(marketData)
      .where(eq(marketData.symbol, symbol))
      .limit(1);
    return data || undefined;
  }

  async getTradingStats(userId: number, isPaperTrade?: boolean): Promise<any> {
    const positionConditions = [eq(positions.userId, userId), eq(positions.status, 'open')];
    const tradeConditions = [eq(trades.userId, userId)];
    const activeTradeConditions = [eq(positions.userId, userId), eq(positions.status, 'open'), sql`CAST(${positions.pnl} AS REAL) != 0`];
    
    if (isPaperTrade !== undefined) {
      positionConditions.push(eq(positions.isPaperTrade, isPaperTrade));
      tradeConditions.push(eq(trades.isPaperTrade, isPaperTrade));
      activeTradeConditions.push(eq(positions.isPaperTrade, isPaperTrade));
    }

    const openPositionsResult = await db
      .select({ count: count() })
      .from(positions)
      .where(and(...positionConditions));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayTradesResult = await db
      .select({ 
        totalPnL: sum(trades.pnl),
        totalTrades: count()
      })
      .from(trades)
      .where(and(
        ...tradeConditions,
        sql`${trades.exitTime} >= ${todayStart.toISOString()}`
      ));

    const allTradesResult = await db
      .select({ 
        totalTrades: count(),
        wonTrades: sum(sql`CASE WHEN CAST(${trades.pnl} AS REAL) > 0 THEN 1 ELSE 0 END`),
      })
      .from(trades)
      .where(and(...tradeConditions));

    const openPositions = openPositionsResult[0]?.count || 0;
    const todayPnL = todayTradesResult[0]?.totalPnL || "0";
    const totalTrades = Number(allTradesResult[0]?.totalTrades) || 0;
    const wonTrades = Number(allTradesResult[0]?.wonTrades) || 0;
    const winRate = totalTrades > 0 ? ((wonTrades / totalTrades) * 100).toFixed(1) : "0.0";

    const activeTradesResult = await db
      .select({ count: count() })
      .from(positions)
      .where(and(...activeTradeConditions));

    const activeTrades = activeTradesResult[0]?.count || 0;

    return {
      openPositions,
      todayPnL,
      winRate,
      activeTrades
    };
  }

  async getTradingSummary(userId: number, isPaperTrade?: boolean): Promise<any> {
    const allTradesResult = await db
      .select({ 
        totalTrades: count(),
        wonTrades: sum(sql`CASE WHEN CAST(${trades.pnl} AS REAL) > 0 THEN 1 ELSE 0 END`),
        lostTrades: sum(sql`CASE WHEN CAST(${trades.pnl} AS REAL) < 0 THEN 1 ELSE 0 END`),
        totalProfit: sum(sql`CASE WHEN CAST(${trades.pnl} AS REAL) > 0 THEN CAST(${trades.pnl} AS REAL) ELSE 0 END`),
        totalLoss: sum(sql`CASE WHEN CAST(${trades.pnl} AS REAL) < 0 THEN CAST(${trades.pnl} AS REAL) ELSE 0 END`),
        avgWin: avg(sql`CASE WHEN CAST(${trades.pnl} AS REAL) > 0 THEN CAST(${trades.pnl} AS REAL) ELSE NULL END`),
        avgLoss: avg(sql`CASE WHEN CAST(${trades.pnl} AS REAL) < 0 THEN CAST(${trades.pnl} AS REAL) ELSE NULL END`),
      })
      .from(trades)
      .where(isPaperTrade !== undefined ? and(eq(trades.userId, userId), eq(trades.isPaperTrade, isPaperTrade)) : eq(trades.userId, userId));

    const openPositionsResult = await db
      .select({ count: count() })
      .from(positions)
      .where(isPaperTrade !== undefined ? and(eq(positions.userId, userId), eq(positions.status, 'open'), eq(positions.isPaperTrade, isPaperTrade)) : and(eq(positions.userId, userId), eq(positions.status, 'open')));

    const stats = allTradesResult[0] || {};
    const openTrades = openPositionsResult[0]?.count || 0;
    
    const wonTrades = parseInt((stats.wonTrades || 0).toString()) || 0;
    const lostTrades = parseInt((stats.lostTrades || 0).toString()) || 0;
    const totalTrades = wonTrades + lostTrades;
    const totalProfit = parseFloat((stats.totalProfit || 0).toString()) || 0;
    const totalLoss = parseFloat((stats.totalLoss || 0).toString()) || 0;
    const netPnL = totalProfit + totalLoss;
    const avgWin = parseFloat((stats.avgWin || 0).toString()) || 0;
    const avgLoss = parseFloat((stats.avgLoss || 0).toString()) || 0;

    // Calculate derived metrics
    const overallWinRate = totalTrades > 0 ? ((wonTrades / totalTrades) * 100).toFixed(1) : "0.0";
    const roi = totalProfit > 0 ? ((netPnL / Math.abs(totalLoss || 1)) * 100).toFixed(1) : "0.0";
    const maxDrawdown = Math.abs(totalLoss).toFixed(2);
    const profitFactor = Math.abs(totalLoss) > 0 ? (totalProfit / Math.abs(totalLoss)).toFixed(2) : "0.00";

    return {
      wonTrades,
      lostTrades,
      openTrades,
      totalProfit: totalProfit.toFixed(2),
      totalLoss: totalLoss.toFixed(2),
      netPnL: netPnL.toFixed(2),
      roi,
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2),
      maxDrawdown,
      profitFactor,
      overallWinRate
    };
  }

  async getTradingOpportunities(): Promise<any[]> {
    // This will be populated by the trading bot's real-time analysis
    // For now, return empty array until real signals are generated
    return [];
  }

  async getStrategyPerformance(userId: number, isPaperTrade?: boolean): Promise<any[]> {
    const strategiesResult = await db
      .select({
        strategy: trades.strategy,
        totalTrades: count(),
        wonTrades: sum(sql`CASE WHEN CAST(${trades.pnl} AS REAL) > 0 THEN 1 ELSE 0 END`),
      })
      .from(trades)
      .where(eq(trades.userId, userId))
      .groupBy(trades.strategy);

    return strategiesResult.map(result => {
      const strategy = result.strategy || 'Unknown';
      const totalTrades = parseInt((result.totalTrades || 0).toString()) || 0;
      const wonTrades = parseInt((result.wonTrades || 0).toString()) || 0;
      const winRate = totalTrades > 0 ? Math.round((wonTrades / totalTrades) * 100) : 0;

      return {
        strategy,
        winRate
      };
    });
  }

  async getPortfolioData(userId: number, isPaperTrade?: boolean): Promise<any> {
    // Get total value from positions
    const positionsResult = await db
      .select({
        totalValue: sum(sql`CAST(${positions.quantity} AS REAL) * CAST(${positions.currentPrice} AS REAL)`)
      })
      .from(positions)
      .where(and(eq(positions.userId, userId), eq(positions.status, 'open')));

    const totalValue = parseFloat((positionsResult[0]?.totalValue || 0).toString()) || 0;

    // Available balance will be fetched from Bybit API in real implementation
    const availableBalance = "0.00";

    return {
      totalValue: (totalValue + parseFloat(availableBalance)).toFixed(2),
      availableBalance
    };
  }
}

export const storage = new DatabaseStorage();
