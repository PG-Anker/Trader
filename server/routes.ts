import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { insertTradingSettingsSchema, insertPositionSchema, insertBotLogSchema, insertSystemErrorSchema } from "@shared/schema";
import { BybitService } from "./services/bybit";
import { TradingBot } from "./services/tradingBot";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Initialize services
  const bybitService = new BybitService();
  const tradingBot = new TradingBot(bybitService, storage);
  
  // Store WebSocket connections
  const wsConnections = new Set<WebSocket>();
  
  wss.on('connection', (ws) => {
    wsConnections.add(ws);
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
      wsConnections.delete(ws);
      console.log('WebSocket client disconnected');
    });
  });
  
  // Broadcast function for real-time updates
  const broadcast = (data: any) => {
    wsConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  };

  // API Routes

  // Get dashboard data
  app.get("/api/dashboard", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      
      const [positions, stats, opportunities, performance] = await Promise.all([
        storage.getOpenPositions(userId),
        storage.getTradingStats(userId),
        storage.getTradingOpportunities(),
        storage.getStrategyPerformance(userId)
      ]);
      
      res.json({
        positions,
        stats,
        opportunities,
        performance
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Get summary data
  app.get("/api/summary", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      
      const [summary, tradeHistory] = await Promise.all([
        storage.getTradingSummary(userId),
        storage.getTradeHistory(userId, 50)
      ]);
      
      res.json({
        summary,
        tradeHistory
      });
    } catch (error) {
      console.error('Summary error:', error);
      res.status(500).json({ message: "Failed to fetch summary data" });
    }
  });

  // Get bot logs
  app.get("/api/bot-logs", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      const logs = await storage.getBotLogs(userId, 100);
      res.json(logs);
    } catch (error) {
      console.error('Bot logs error:', error);
      res.status(500).json({ message: "Failed to fetch bot logs" });
    }
  });

  // Get system errors
  app.get("/api/system-errors", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      const errors = await storage.getSystemErrors(userId, 50);
      res.json(errors);
    } catch (error) {
      console.error('System errors error:', error);
      res.status(500).json({ message: "Failed to fetch system errors" });
    }
  });

  // Get trading settings
  app.get("/api/settings", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      const settings = await storage.getTradingSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error('Settings error:', error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Update trading settings
  app.post("/api/settings", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      const validatedData = insertTradingSettingsSchema.parse({
        ...req.body,
        userId
      });
      
      const settings = await storage.updateTradingSettings(userId, validatedData);
      res.json(settings);
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Test API connection
  app.post("/api/test-connection", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      const settings = await storage.getTradingSettings(userId);
      
      if (!settings?.apiKey || !settings?.secretKey) {
        return res.status(400).json({ message: "API credentials not configured" });
      }
      
      const result = await bybitService.testConnection(settings.apiKey, settings.secretKey, settings.environment === 'mainnet');
      res.json(result);
    } catch (error) {
      console.error('Test connection error:', error);
      res.status(500).json({ message: "Connection test failed" });
    }
  });

  // Manual trade actions
  app.post("/api/positions/:id/close", async (req, res) => {
    try {
      const positionId = parseInt(req.params.id);
      const userId = 1; // TODO: Get from session/auth
      
      const result = await tradingBot.closePosition(positionId, userId);
      
      // Broadcast update
      broadcast({
        type: 'position_closed',
        data: result
      });
      
      res.json(result);
    } catch (error) {
      console.error('Close position error:', error);
      res.status(500).json({ message: "Failed to close position" });
    }
  });

  // Start/stop trading bot
  app.post("/api/bot/:action", async (req, res) => {
    try {
      const action = req.params.action;
      const userId = 1; // TODO: Get from session/auth
      
      if (action === 'start') {
        await tradingBot.start(userId);
        res.json({ message: "Trading bot started" });
      } else if (action === 'stop') {
        await tradingBot.stop();
        res.json({ message: "Trading bot stopped" });
      } else {
        res.status(400).json({ message: "Invalid action" });
      }
    } catch (error) {
      console.error('Bot action error:', error);
      res.status(500).json({ message: "Failed to perform bot action" });
    }
  });

  // Clear logs
  app.delete("/api/bot-logs", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      await storage.clearBotLogs(userId);
      res.json({ message: "Logs cleared" });
    } catch (error) {
      console.error('Clear logs error:', error);
      res.status(500).json({ message: "Failed to clear logs" });
    }
  });

  // Get portfolio data
  app.get("/api/portfolio", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      const portfolio = await storage.getPortfolioData(userId);
      res.json(portfolio);
    } catch (error) {
      console.error('Portfolio error:', error);
      res.status(500).json({ message: "Failed to fetch portfolio data" });
    }
  });

  // Set up real-time data broadcasting
  tradingBot.on('log', (log) => {
    broadcast({
      type: 'bot_log',
      data: log
    });
  });

  tradingBot.on('error', (error) => {
    broadcast({
      type: 'system_error',
      data: error
    });
  });

  tradingBot.on('position_update', (position) => {
    broadcast({
      type: 'position_update',
      data: position
    });
  });

  tradingBot.on('price_update', (priceData) => {
    broadcast({
      type: 'price_update',
      data: priceData
    });
  });

  return httpServer;
}
