import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const tradingSettings = sqliteTable("trading_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  usdtPerTrade: text("usdt_per_trade").notNull().default("100"),
  maxPositions: integer("max_positions").notNull().default(10),
  riskPerTrade: text("risk_per_trade").notNull().default("2.5"),
  stopLoss: text("stop_loss").notNull().default("3.0"),
  takeProfit: text("take_profit").notNull().default("6.0"),
  apiKey: text("api_key"),
  secretKey: text("secret_key"),
  environment: text("environment").notNull().default("mainnet"),
  spotPaperTrading: integer("spot_paper_trading", { mode: "boolean" }).notNull().default(true),
  leveragePaperTrading: integer("leverage_paper_trading", { mode: "boolean" }).notNull().default(true),
  rsiPeriod: integer("rsi_period").notNull().default(14),
  rsiLow: integer("rsi_low").notNull().default(30),
  rsiHigh: integer("rsi_high").notNull().default(70),
  emaFast: integer("ema_fast").notNull().default(12),
  emaSlow: integer("ema_slow").notNull().default(26),
  macdSignal: integer("macd_signal").notNull().default(9),
  adxPeriod: integer("adx_period").notNull().default(14),
  strategies: text("strategies").notNull().default('{"trendFollowing": true, "meanReversion": true, "breakoutTrading": false, "pullbackTrading": true}'),
  aiTradingEnabled: integer("ai_trading_enabled", { mode: "boolean" }).notNull().default(false),
  timeframe: text("timeframe").notNull().default("15m"),
  minConfidence: integer("min_confidence").notNull().default(75),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const positions = sqliteTable("positions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  symbol: text("symbol").notNull(),
  direction: text("direction").notNull(), // "UP", "LONG", "SHORT"
  entryPrice: text("entry_price").notNull(),
  currentPrice: text("current_price").notNull(),
  stopLoss: text("stop_loss"),
  takeProfit: text("take_profit"),
  quantity: text("quantity").notNull(),
  pnl: text("pnl").notNull().default("0"),
  status: text("status").notNull().default("open"), // "open", "closed"
  tradingMode: text("trading_mode").notNull(), // "spot", "leverage"
  strategy: text("strategy"),
  isPaperTrade: integer("is_paper_trade", { mode: "boolean" }).notNull().default(true),
  bybitOrderId: text("bybit_order_id"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  closedAt: text("closed_at"),
});

export const trades = sqliteTable("trades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  symbol: text("symbol").notNull(),
  direction: text("direction").notNull(),
  entryPrice: text("entry_price").notNull(),
  exitPrice: text("exit_price").notNull(),
  quantity: text("quantity").notNull(),
  pnl: text("pnl").notNull(),
  duration: integer("duration"), // in minutes
  strategy: text("strategy"),
  tradingMode: text("trading_mode").notNull(),
  isPaperTrade: integer("is_paper_trade", { mode: "boolean" }).notNull().default(true),
  entryTime: text("entry_time").notNull(),
  exitTime: text("exit_time").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const botLogs = sqliteTable("bot_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  level: text("level").notNull(), // "INFO", "ANALYSIS", "SIGNAL", "TRADE", "ORDER", "MONITOR", "SCAN", "STRATEGY"
  message: text("message").notNull(),
  symbol: text("symbol"),
  data: text("data"), // JSON string
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const systemErrors = sqliteTable("system_errors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  level: text("level").notNull(), // "INFO", "WARNING", "ERROR"
  title: text("title").notNull(),
  message: text("message").notNull(),
  source: text("source"),
  errorCode: text("error_code"),
  resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const marketData = sqliteTable("market_data", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull(),
  price: text("price").notNull(),
  volume: text("volume").notNull(),
  change24h: text("change_24h"),
  timestamp: text("timestamp").default("CURRENT_TIMESTAMP"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  positions: many(positions),
  trades: many(trades),
  botLogs: many(botLogs),
  systemErrors: many(systemErrors),
  tradingSettings: many(tradingSettings),
}));

export const positionsRelations = relations(positions, ({ one }) => ({
  user: one(users, {
    fields: [positions.userId],
    references: [users.id],
  }),
}));

export const tradesRelations = relations(trades, ({ one }) => ({
  user: one(users, {
    fields: [trades.userId],
    references: [users.id],
  }),
}));

export const botLogsRelations = relations(botLogs, ({ one }) => ({
  user: one(users, {
    fields: [botLogs.userId],
    references: [users.id],
  }),
}));

export const systemErrorsRelations = relations(systemErrors, ({ one }) => ({
  user: one(users, {
    fields: [systemErrors.userId],
    references: [users.id],
  }),
}));

export const tradingSettingsRelations = relations(tradingSettings, ({ one }) => ({
  user: one(users, {
    fields: [tradingSettings.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTradingSettingsSchema = createInsertSchema(tradingSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
  createdAt: true,
  closedAt: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
});

export const insertBotLogSchema = createInsertSchema(botLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSystemErrorSchema = createInsertSchema(systemErrors).omit({
  id: true,
  createdAt: true,
});

export const insertMarketDataSchema = createInsertSchema(marketData).omit({
  id: true,
  timestamp: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type TradingSettings = typeof tradingSettings.$inferSelect;
export type InsertTradingSettings = z.infer<typeof insertTradingSettingsSchema>;
export type Position = typeof positions.$inferSelect;
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type BotLog = typeof botLogs.$inferSelect;
export type InsertBotLog = z.infer<typeof insertBotLogSchema>;
export type SystemError = typeof systemErrors.$inferSelect;
export type InsertSystemError = z.infer<typeof insertSystemErrorSchema>;
export type MarketData = typeof marketData.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
