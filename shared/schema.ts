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
  userId: integer("userId").notNull(),
  usdtPerTrade: text("usdtPerTrade").notNull().default("100"),
  maxPositions: integer("maxPositions").notNull().default(10),
  riskPerTrade: text("riskPerTrade").notNull().default("2.5"),
  stopLoss: text("stopLoss").notNull().default("3.0"),
  takeProfit: text("takeProfit").notNull().default("6.0"),
  apiKey: text("apiKey"),
  secretKey: text("secretKey"),
  environment: text("environment").notNull().default("mainnet"),
  spotPaperTrading: integer("spotPaperTrading", { mode: "boolean" }).notNull().default(true),
  leveragePaperTrading: integer("leveragePaperTrading", { mode: "boolean" }).notNull().default(true),
  rsiPeriod: integer("rsiPeriod").notNull().default(14),
  rsiLow: integer("rsiLow").notNull().default(30),
  rsiHigh: integer("rsiHigh").notNull().default(70),
  emaFast: integer("emaFast").notNull().default(12),
  emaSlow: integer("emaSlow").notNull().default(26),
  macdSignal: integer("macdSignal").notNull().default(9),
  adxPeriod: integer("adxPeriod").notNull().default(14),
  strategies: text("strategies").notNull().default('{"trendFollowing": true, "meanReversion": true, "breakoutTrading": false, "pullbackTrading": true}'),
  spotStrategies: text("spotStrategies").notNull().default('{"trendFollowing": true, "meanReversion": true, "breakoutTrading": false, "pullbackTrading": true}'),
  leverageStrategies: text("leverageStrategies").notNull().default('{"trendFollowing": true, "meanReversion": false, "breakoutTrading": true, "pullbackTrading": false}'),
  aiTradingEnabled: integer("aiTradingEnabled", { mode: "boolean" }).notNull().default(false),
  spotAiTradingEnabled: integer("spotAiTradingEnabled", { mode: "boolean" }).notNull().default(false),
  leverageAiTradingEnabled: integer("leverageAiTradingEnabled", { mode: "boolean" }).notNull().default(false),
  timeframe: text("timeframe").notNull().default("15m"),
  minConfidence: integer("minConfidence").notNull().default(75),
  updatedAt: text("updatedAt").default("CURRENT_TIMESTAMP"),
});

export const positions = sqliteTable("positions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  symbol: text("symbol").notNull(),
  direction: text("direction").notNull(), // "UP", "LONG", "SHORT"
  entryPrice: text("entryPrice").notNull(),
  currentPrice: text("currentPrice").notNull(),
  stopLoss: text("stopLoss"),
  takeProfit: text("takeProfit"),
  quantity: text("quantity").notNull(),
  pnl: text("pnl").notNull().default("0"),
  status: text("status").notNull().default("open"), // "open", "closed"
  tradingMode: text("tradingMode").notNull(), // "spot", "leverage"
  strategy: text("strategy"),
  isPaperTrade: integer("isPaperTrade", { mode: "boolean" }).notNull().default(true),
  bybitOrderId: text("bybitOrderId"),
  createdAt: text("createdAt").default("CURRENT_TIMESTAMP"),
  closedAt: text("closedAt"),
});

export const trades = sqliteTable("trades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  symbol: text("symbol").notNull(),
  direction: text("direction").notNull(),
  entryPrice: text("entryPrice").notNull(),
  exitPrice: text("exitPrice").notNull(),
  quantity: text("quantity").notNull(),
  pnl: text("pnl").notNull(),
  duration: integer("duration"), // in minutes
  strategy: text("strategy"),
  tradingMode: text("tradingMode").notNull(),
  isPaperTrade: integer("isPaperTrade", { mode: "boolean" }).notNull().default(true),
  entryTime: text("entryTime").notNull(),
  exitTime: text("exitTime").notNull(),
  createdAt: text("createdAt").default("CURRENT_TIMESTAMP"),
});

export const botLogs = sqliteTable("bot_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  level: text("level").notNull(), // "INFO", "ANALYSIS", "SIGNAL", "TRADE", "ORDER", "MONITOR", "SCAN", "STRATEGY"
  message: text("message").notNull(),
  symbol: text("symbol"),
  data: text("data"), // JSON string
  createdAt: text("createdAt").default("CURRENT_TIMESTAMP"),
});

export const systemErrors = sqliteTable("system_errors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  level: text("level").notNull(), // "INFO", "WARNING", "ERROR"
  title: text("title").notNull(),
  message: text("message").notNull(),
  source: text("source"),
  errorCode: text("errorCode"),
  resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
  createdAt: text("createdAt").default("CURRENT_TIMESTAMP"),
});

export const marketData = sqliteTable("market_data", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull(),
  price: text("price").notNull(),
  volume: text("volume").notNull(),
  change24h: text("change24h"),
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
}).extend({
  strategies: z.union([
    z.string(),
    z.object({
      trendFollowing: z.boolean(),
      meanReversion: z.boolean(),
      breakoutTrading: z.boolean(),
      pullbackTrading: z.boolean()
    }).transform((obj) => JSON.stringify(obj))
  ]).optional(),
  spotStrategies: z.union([
    z.string(),
    z.object({
      trendFollowing: z.boolean(),
      meanReversion: z.boolean(),
      breakoutTrading: z.boolean(),
      pullbackTrading: z.boolean()
    }).transform((obj) => JSON.stringify(obj))
  ]).optional(),
  leverageStrategies: z.union([
    z.string(),
    z.object({
      trendFollowing: z.boolean(),
      meanReversion: z.boolean(),
      breakoutTrading: z.boolean(),
      pullbackTrading: z.boolean()
    }).transform((obj) => JSON.stringify(obj))
  ]).optional()
}).partial();

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
