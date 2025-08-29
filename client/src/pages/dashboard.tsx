import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { StatsCards } from "@/components/StatsCards";
import { PositionsTable } from "@/components/PositionsTable";
import { TradingOpportunities } from "@/components/TradingOpportunities";
import { StrategyPerformance } from "@/components/StrategyPerformance";
import { SummaryTab } from "@/components/SummaryTab";
import BotLogsPolling from "@/components/BotLogsPolling";
import SystemErrors from "@/components/SystemErrors";
import DualBotSettings from "@/components/DualBotSettings";
import { BotControl } from "@/components/BotControl";
// import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import type { Position, BotLog, SystemError, PortfolioData } from "@/lib/types";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const [positions, setPositions] = useState<Position[]>([]);
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({ totalValue: '0', availableBalance: '0' });
  const [botStatus, setBotStatus] = useState({ 
    spot: { isRunning: false, startedAt: null, lastActivity: null, userId: null, type: 'spot' as const },
    leverage: { isRunning: false, startedAt: null, lastActivity: null, userId: null, type: 'leverage' as const },
    // Legacy compatibility
    isRunning: false, 
    startedAt: null, 
    lastActivity: null, 
    userId: null 
  });
  const { toast } = useToast();



  // Fetch trading settings for paper trading status
  const { data: settings } = useQuery<any>({
    queryKey: ['/api/settings'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Determine if we're in paper trading mode
  const isPaperTrade = Boolean(settings?.spotPaperTrading || settings?.leveragePaperTrading);

  // Fetch dashboard data
  const { data: dashboardData, refetch: refetchDashboard } = useQuery<any>({
    queryKey: ['/api/dashboard', { paperTrade: isPaperTrade }],
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: !!settings, // Wait for settings to load
  });

  // Fetch portfolio data
  const { data: portfolio } = useQuery<any>({
    queryKey: ['/api/portfolio', { paperTrade: isPaperTrade }],
    refetchInterval: 10000, // Refetch every 10 seconds
    enabled: !!settings, // Wait for settings to load
  });

  // Fetch dual bot status
  const { data: botStatusData } = useQuery<any>({
    queryKey: ['/api/bot/status'],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  useEffect(() => {
    if (botStatusData) {
      // Handle new dual bot format
      if (botStatusData.spot && botStatusData.leverage) {
        setBotStatus({
          spot: botStatusData.spot,
          leverage: botStatusData.leverage,
          // Legacy compatibility
          isRunning: botStatusData.spot.isRunning || botStatusData.leverage.isRunning,
          startedAt: botStatusData.spot.startedAt || botStatusData.leverage.startedAt,
          lastActivity: botStatusData.spot.lastActivity || botStatusData.leverage.lastActivity,
          userId: botStatusData.spot.userId || botStatusData.leverage.userId
        });
      } else {
        // Handle legacy format
        setBotStatus({
          spot: { isRunning: false, startedAt: null, lastActivity: null, userId: null, type: 'spot' as const },
          leverage: { isRunning: false, startedAt: null, lastActivity: null, userId: null, type: 'leverage' as const },
          isRunning: botStatusData.isRunning || false,
          startedAt: botStatusData.startedAt || null,
          lastActivity: botStatusData.lastActivity || null,
          userId: botStatusData.userId || null
        });
      }
    }
  }, [botStatusData]);

  useEffect(() => {
    if (portfolio) {
      setPortfolioData({
        totalValue: portfolio.totalValue || '0',
        availableBalance: portfolio.availableBalance || '0'
      });
    }
  }, [portfolio]);

  useEffect(() => {
    if (dashboardData?.positions) {
      setPositions(dashboardData.positions || []);
    }
  }, [dashboardData]);

  // WebSocket temporarily disabled due to connection issues - using API polling
  /*useWebSocket({
    onMessage: (message) => {
      switch (message.type) {
        case 'position_update':
          setPositions(prev => 
            prev.map(pos => 
              pos.id === message.data.id ? { ...pos, ...message.data } : pos
            )
          );
          break;
        
        case 'position_closed':
          setPositions(prev => prev.filter(pos => pos.id !== message.data.id));
          // Only show toast for actual position closures, not connection issues
          if (message.data?.symbol && message.data?.pnl) {
            toast({
              title: "Position Closed",
              description: `${message.data.symbol} position closed with PnL: ${message.data.pnl}`,
            });
          }
          refetchDashboard();
          break;
        
        case 'bot_log':
          // Real-time logs will be handled by BotLogTab component
          break;
        
        case 'system_error':
          // Only show toast for high severity errors
          if (message.data?.level === 'ERROR') {
            toast({
              title: "System Error",
              description: message.data.title,
              variant: "destructive",
            });
          }
          break;
        
        case 'price_update':
          // Update current prices in positions
          setPositions(prev => 
            prev.map(pos => 
              pos.symbol === message.data.symbol 
                ? { ...pos, currentPrice: message.data.price } 
                : pos
            )
          );
          break;

        case 'bot_status_update':
          setBotStatus(message.data);
          break;
      }
    },
    // Remove error toast spam - connection issues are normal
    onError: () => {
      // Silent error handling - WebSocket will attempt reconnection automatically
      console.log('WebSocket connection error - will retry');
    }
  });*/



  const getTabTitle = () => {
    const titles = {
      'dashboard': 'Trading Dashboard',
      'summary': 'Trading Summary',
      'bot-log': 'Bot Activity Log',
      'system-error': 'System Errors',
      'settings': 'Bot Settings'
    };
    return titles[activeTab as keyof typeof titles];
  };



  // Show loading spinner while settings are loading
  if (!settings) {
    return (
      <div className="flex h-screen items-center justify-center bg-crypto-dark-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-crypto-dark-900 text-white">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-crypto-dark-800 border-b border-crypto-dark-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{getTabTitle()}</h2>
              <p className="text-gray-400">Dual bot trading system with independent spot and leverage controls</p>
              
              {/* Trading Mode Indicators */}
              {activeTab === 'dashboard' && settings && (
                <div className="mt-2 space-y-2">
                  {/* AI Trading Indicator */}
                  {(settings as any)?.aiTradingEnabled && (
                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium text-purple-300">
                        AI Trading Enabled - DeepSeek Analysis
                      </span>
                    </div>
                  )}
                  
                  {/* Paper Trading Indicator */}
                  {((settings as any)?.spotPaperTrading || (settings as any)?.leveragePaperTrading) && (
                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium text-blue-300">
                        Paper Trading Active - {
                          (settings as any)?.spotPaperTrading && (settings as any)?.leveragePaperTrading
                            ? "Both Modes"
                            : (settings as any)?.spotPaperTrading
                            ? "Spot Only"
                            : "Leverage Only"
                        }
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">Total Portfolio</p>
                <p className="text-xl font-bold font-mono">${portfolioData.totalValue}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Available USDT</p>
                <p className="text-lg font-bold font-mono text-primary">{portfolioData.availableBalance}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <StatsCards data={dashboardData?.stats || {}} />
              
              {/* Dual Bot Control Components */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BotControl 
                  status={botStatus.spot || { isRunning: false, startedAt: null, lastActivity: null, userId: null, type: 'spot' as const }} 
                  botType="spot"
                  title="Spot Trading Bot"
                  description="Buy low, sell high strategy"
                />
                <BotControl 
                  status={botStatus.leverage || { isRunning: false, startedAt: null, lastActivity: null, userId: null, type: 'leverage' as const }} 
                  botType="leverage"
                  title="Leverage Trading Bot"
                  description="Long and short positions"
                />
              </div>
              
              <PositionsTable 
                positions={positions} 
                onPositionClose={refetchDashboard}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TradingOpportunities data={dashboardData?.opportunities || []} />
                <StrategyPerformance data={dashboardData?.performance || []} />
              </div>
            </div>
          )}

          {activeTab === 'summary' && <SummaryTab />}
          {activeTab === 'bot-log' && <BotLogsPolling />}
          {activeTab === 'system-error' && <SystemErrors />}
          {activeTab === 'settings' && <DualBotSettings />}
        </main>
      </div>
    </div>
  );
}
