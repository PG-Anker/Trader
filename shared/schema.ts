import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const tradingSettings = pgTable("trading_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  usdtPerTrade: decimal("usdt_per_trade", { precision: 10, scale: 2 }).notNull().default("100"),
  maxPositions: integer("max_positions").notNull().default(10),
  riskPerTrade: decimal("risk_per_trade", { precision: 5, scale: 2 }).notNull().default("2.5"),
  stopLoss: decimal("stop_loss", { precision: 5, scale: 2 }).notNull().default("3.0"),
  takeProfit: decimal("take_profit", { precision: 5, scale: 2 }).notNull().default("6.0"),
  apiKey: text("api_key"),
  secretKey: text("secret_key"),
  environment: text("environment").notNull().default("testnet"),
  rsiPeriod: integer("rsi_period").notNull().default(14),
  rsiLow: integer("rsi_low").notNull().default(30),
  rsiHigh: integer("rsi_high").notNull().default(70),
  emaFast: integer("ema_fast").notNull().default(12),
  emaSlow: integer("ema_slow").notNull().default(26),
  macdSignal: integer("macd_signal").notNull().default(9),
  adxPeriod: integer("adx_period").notNull().default(14),
  strategies: jsonb("strategies").notNull().default('{"trendFollowing": true, "meanReversion": true, "breakoutTrading": false, "pullbackTrading": true}'),
  timeframe: text("timeframe").notNull().default("15m"),
  minConfidence: integer("min_confidence").notNull().default(75),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  symbol: text("symbol").notNull(),
  direction: text("direction").notNull(), // "UP", "LONG", "SHORT"
  entryPrice: decimal("entry_price", { precision: 15, scale: 8 }).notNull(),
  currentPrice: decimal("current_price", { precision: 15, scale: 8 }).notNull(),
  stopLoss: decimal("stop_loss", { precision: 15, scale: 8 }),
  takeProfit: decimal("take_profit", { precision: 15, scale: 8 }),
  quantity: decimal("quantity", { precision: 15, scale: 8 }).notNull(),
  pnl: decimal("pnl", { precision: 15, scale: 8 }).notNull().default("0"),
  status: text("status").notNull().default("open"), // "open", "closed"
  tradingMode: text("trading_mode").notNull(), // "spot", "leverage"
  strategy: text("strategy"),
  bybitOrderId: text("bybit_order_id"),
  createdAt: timestamp("created_at").defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  symbol: text("symbol").notNull(),
  direction: text("direction").notNull(),
  entryPrice: decimal("entry_price", { precision: 15, scale: 8 }).notNull(),
  exitPrice: decimal("exit_price", { precision: 15, scale: 8 }).notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 8 }).notNull(),
  pnl: decimal("pnl", { precision: 15, scale: 8 }).notNull(),
  duration: integer("duration"), // in minutes
  strategy: text("strategy"),
  tradingMode: text("trading_mode").notNull(),
  entryTime: timestamp("entry_time").notNull(),
  exitTime: timestamp("exit_time").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const botLogs = pgTable("bot_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  level: text("level").notNull(), // "INFO", "ANALYSIS", "SIGNAL", "TRADE", "ORDER", "MONITOR", "SCAN", "STRATEGY"
  message: text("message").notNull(),
  symbol: text("symbol"),
  data: jsonb("data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const systemErrors = pgTable("system_errors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  level: text("level").notNull(), // "INFO", "WARNING", "ERROR"
  title: text("title").notNull(),
  message: text("message").notNull(),
  source: text("source"),
  errorCode: text("error_code"),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const marketData = pgTable("market_data", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  price: decimal("price", { precision: 15, scale: 8 }).notNull(),
  volume: decimal("volume", { precision: 15, scale: 8 }).notNull(),
  change24h: decimal("change_24h", { precision: 5, scale: 2 }),
  timestamp: timestamp("timestamp").defaultNow(),
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
