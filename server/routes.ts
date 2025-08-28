import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { insertTradingSettingsSchema, insertPositionSchema, insertBotLogSchema, insertSystemErrorSchema } from "@shared/schema";
import { BybitService } from "./services/bybit";
import { BotManager } from "./services/botManager";
import { setupAuthRoutes, requireAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Initialize services
  const bybitService = new BybitService();
  const botManager = new BotManager(bybitService, storage);
  
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

  // Removed legacy bot status tracking - now handled by BotManager

  // API Routes

  // Health check endpoint - ensure this works before other routes
  app.get("/api/health", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      database: "sqlite"
    });
  });

  // Get dashboard data
  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const isPaperTrade = req.query.paperTrade === 'true';
      
      const [positions, stats, opportunities, performance] = await Promise.all([
        storage.getOpenPositions(userId),
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
      
      // Disable caching for real-time updates
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('ETag', Date.now().toString()); // Force fresh data
      
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
      
      const result = await botManager.closePosition(positionId, userId);
      
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

  // Start/stop individual trading bots
  app.post("/api/bot/:botType/:action", requireAuth, async (req, res) => {
    try {
      const botType = req.params.botType; // 'spot' or 'leverage'
      const action = req.params.action; // 'start' or 'stop'
      const userId = (req as any).user.id;
      
      if (!['spot', 'leverage'].includes(botType)) {
        return res.status(400).json({ message: "Invalid bot type. Use 'spot' or 'leverage'" });
      }
      
      if (action === 'start') {
        if (botType === 'spot') {
          if (botManager.getSpotStatus().isRunning) {
            return res.status(400).json({ message: "Spot trading bot is already running" });
          }
          await botManager.startSpotBot(userId);
        } else {
          if (botManager.getLeverageStatus().isRunning) {
            return res.status(400).json({ message: "Leverage trading bot is already running" });
          }
          await botManager.startLeverageBot(userId);
        }
        
        // Broadcast bot status update
        broadcast({
          type: 'bot_status_update',
          data: botManager.getBothStatuses()
        });
        
        res.json({ 
          success: true, 
          message: `${botType.charAt(0).toUpperCase() + botType.slice(1)} trading bot started successfully`,
          status: botManager.getBothStatuses()
        });
      } else if (action === 'stop') {
        if (botType === 'spot') {
          if (!botManager.getSpotStatus().isRunning) {
            return res.status(400).json({ message: "Spot trading bot is not running" });
          }
          await botManager.stopSpotBot();
        } else {
          if (!botManager.getLeverageStatus().isRunning) {
            return res.status(400).json({ message: "Leverage trading bot is not running" });
          }
          await botManager.stopLeverageBot();
        }
        
        // Broadcast bot status update
        broadcast({
          type: 'bot_status_update',
          data: botManager.getBothStatuses()
        });
        
        res.json({ 
          success: true, 
          message: `${botType.charAt(0).toUpperCase() + botType.slice(1)} trading bot stopped successfully`,
          status: botManager.getBothStatuses()
        });
      } else {
        res.status(400).json({ message: "Invalid action. Use 'start' or 'stop'" });
      }
    } catch (error) {
      console.error('Bot action error:', error);
      res.status(500).json({ 
        message: `Failed to ${req.params.action} ${req.params.botType} trading bot: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });

  // Legacy route for backward compatibility - start/stop both bots
  app.post("/api/bot/:action", requireAuth, async (req, res) => {
    try {
      const action = req.params.action;
      const userId = (req as any).user.id;
      
      if (action === 'start') {
        if (botManager.isAnyBotRunning()) {
          return res.status(400).json({ message: "Trading bots are already running" });
        }
        
        await botManager.start(userId);
        const botStatus = botManager.getBothStatuses();
        
        // Broadcast bot status update
        broadcast({
          type: 'bot_status_update',
          data: botStatus
        });
        
        res.json({ 
          success: true,
          message: "Both trading bots started successfully",
          status: botStatus
        });
      } else if (action === 'stop') {
        if (!botManager.isAnyBotRunning()) {
          return res.status(400).json({ message: "No trading bots are running" });
        }
        
        await botManager.stop();
        const botStatus = botManager.getBothStatuses();
        
        // Broadcast bot status update
        broadcast({
          type: 'bot_status_update',
          data: botStatus
        });
        
        res.json({ 
          success: true,
          message: "Both trading bots stopped successfully",
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
  botManager.on('spot_log', (log) => {
    broadcast({
      type: 'bot_log',
      data: { ...log, botType: 'spot' }
    });
  });

  botManager.on('leverage_log', (log) => {
    broadcast({
      type: 'bot_log',
      data: { ...log, botType: 'leverage' }
    });
  });

  botManager.on('spot_error', (error) => {
    broadcast({
      type: 'system_error',
      data: { ...error, botType: 'spot' }
    });
  });

  botManager.on('leverage_error', (error) => {
    broadcast({
      type: 'system_error',
      data: { ...error, botType: 'leverage' }
    });
  });

  // Get bot status endpoint (dual bot support)
  app.get("/api/bot/status", requireAuth, async (req, res) => {
    const bothStatuses = botManager.getBothStatuses();
    res.json({
      spot: bothStatuses.spot,
      leverage: bothStatuses.leverage,
      isAnyRunning: botManager.isAnyBotRunning(),
      runningBotsCount: botManager.getRunningBotsCount()
    });
  });

  return httpServer;
}
