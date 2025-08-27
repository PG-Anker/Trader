import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { insertTradingSettingsSchema, insertPositionSchema, insertBotLogSchema, insertSystemErrorSchema } from "@shared/schema";
import { BybitService } from "./services/bybit";
import { TradingBot } from "./services/tradingBot";
import { setupAuthRoutes, requireAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Initialize services
  const bybitService = new BybitService();
  const tradingBot = new TradingBot(bybitService, storage);
  
  // Store WebSocket connections
  const wsConnections = new Set<WebSocket>();
  
  wss.on('connection', (ws, req) => {
    wsConnections.add(ws);
    console.log('WebSocket client connected from:', req.socket.remoteAddress);
    
    // Send immediate welcome message to confirm connection
    ws.send(JSON.stringify({
      type: 'connection_confirmed',
      data: { message: 'WebSocket connected successfully', timestamp: new Date().toISOString() }
    }));
    
    ws.on('close', () => {
      wsConnections.delete(ws);
      console.log('WebSocket client disconnected');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsConnections.delete(ws);
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

  // Setup authentication routes
  setupAuthRoutes(app);

  // Bot status tracking
  let botStatus = {
    isRunning: false,
    userId: null as number | null,
    startedAt: null as string | null,
    lastActivity: null as string | null
  };

  // API Routes

  // Get dashboard data
  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const isPaperTrade = req.query.paperTrade === 'true';
      
      const [positions, stats, opportunities, performance] = await Promise.all([
        storage.getOpenPositions(userId, isPaperTrade),
        storage.getTradingStats(userId, isPaperTrade),
        storage.getTradingOpportunities(),
        storage.getStrategyPerformance(userId, isPaperTrade)
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
  app.get("/api/summary", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const isPaperTrade = req.query.paperTrade === 'true';
      
      const [summary, tradeHistory] = await Promise.all([
        storage.getTradingSummary(userId, isPaperTrade),
        storage.getTradeHistory(userId, isPaperTrade, 50)
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
  app.get("/api/bot-logs", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const logs = await storage.getBotLogs(userId, 100);
      res.json(logs);
    } catch (error) {
      console.error('Bot logs error:', error);
      res.status(500).json({ message: "Failed to fetch bot logs" });
    }
  });

  // Get system errors
  app.get("/api/system-errors", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const errors = await storage.getSystemErrors(userId, 50);
      res.json(errors);
    } catch (error) {
      console.error('System errors error:', error);
      res.status(500).json({ message: "Failed to fetch system errors" });
    }
  });

  // Get trading settings
  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const settings = await storage.getTradingSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error('Settings error:', error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Update trading settings
  app.post("/api/settings", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      console.log('Received settings update request:', req.body);
      
      const validatedData = insertTradingSettingsSchema.parse({
        ...req.body,
        userId
      });
      
      console.log('Validated settings data:', validatedData);
      
      const settings = await storage.updateTradingSettings(userId, validatedData);
      res.json(settings);
    } catch (error) {
      console.error('Update settings error:', error);
      if (error instanceof Error && 'name' in error && error.name === 'ZodError') {
        console.error('Validation errors:', (error as any).issues);
        res.status(400).json({ 
          message: "Validation failed", 
          errors: (error as any).issues 
        });
      } else {
        res.status(500).json({ message: "Failed to update settings" });
      }
    }
  });

  // Test API connection
  app.post("/api/test-connection", requireAuth, async (req, res) => {
    try {
      // Use credentials from request body if provided, otherwise from stored settings
      const { apiKey: reqApiKey, secretKey: reqSecretKey } = req.body;
      
      let apiKey = reqApiKey;
      let secretKey = reqSecretKey;
      
      // If no credentials in request, use stored settings
      if (!apiKey || !secretKey) {
        const userId = (req as any).user.id;
        const settings = await storage.getTradingSettings(userId);
        apiKey = settings?.apiKey;
        secretKey = settings?.secretKey;
      }
      
      if (!apiKey || !secretKey) {
        return res.status(400).json({ 
          success: false,
          message: "API credentials not provided. Please enter your Bybit API key and secret key." 
        });
      }
      
      const result = await bybitService.testConnection(apiKey, secretKey);
      res.json(result);
    } catch (error) {
      console.error('Test connection error:', error);
      res.status(500).json({ 
        success: false,
        message: "Connection test failed" 
      });
    }
  });

  // Manual trade actions
  app.post("/api/positions/:id/close", async (req, res) => {
    try {
      const positionId = parseInt(req.params.id);
      const userId = (req as any).user.id;
      
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
  app.post("/api/bot/:action", requireAuth, async (req, res) => {
    try {
      const action = req.params.action;
      const userId = (req as any).user.id;
      
      if (action === 'start') {
        if (botStatus.isRunning) {
          return res.status(400).json({ message: "Trading bot is already running" });
        }
        
        await tradingBot.start(userId);
        botStatus = {
          isRunning: true,
          userId,
          startedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };
        
        // Broadcast bot status update
        broadcast({
          type: 'bot_status_update',
          data: botStatus
        });
        
        res.json({ 
          success: true,
          message: "Trading bot started",
          status: botStatus
        });
      } else if (action === 'stop') {
        if (!botStatus.isRunning) {
          return res.status(400).json({ message: "Trading bot is not running" });
        }
        
        await tradingBot.stop();
        botStatus = {
          isRunning: false,
          userId: null,
          startedAt: null,
          lastActivity: new Date().toISOString()
        };
        
        // Broadcast bot status update
        broadcast({
          type: 'bot_status_update',
          data: botStatus
        });
        
        res.json({ 
          success: true,
          message: "Trading bot stopped",
          status: botStatus
        });
      } else {
        res.status(400).json({ message: "Invalid action. Use 'start' or 'stop'" });
      }
    } catch (error) {
      console.error('Bot action error:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : "Failed to perform bot action"
      });
    }
  });

  // Clear logs
  app.delete("/api/bot-logs", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      await storage.clearBotLogs(userId);
      res.json({ message: "Logs cleared" });
    } catch (error) {
      console.error('Clear logs error:', error);
      res.status(500).json({ message: "Failed to clear logs" });
    }
  });

  // Get portfolio data
  app.get("/api/portfolio", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const isPaperTrade = req.query.paperTrade === 'true';
      const portfolio = await storage.getPortfolioData(userId, isPaperTrade);
      res.json(portfolio);
    } catch (error) {
      console.error('Portfolio error:', error);
      res.status(500).json({ message: "Failed to fetch portfolio data" });
    }
  });

  // Set up real-time data broadcasting
  tradingBot.on('log', (log) => {
    // Update last activity timestamp
    if (botStatus.isRunning) {
      botStatus.lastActivity = new Date().toISOString();
    }
    
    broadcast({
      type: 'bot_log',
      data: log
    });
  });

  // Get bot status endpoint
  app.get("/api/bot/status", requireAuth, async (req, res) => {
    res.json({
      isRunning: botStatus.isRunning,
      startedAt: botStatus.startedAt,
      lastActivity: botStatus.lastActivity,
      userId: botStatus.userId
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
