import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { StatsCards } from "@/components/StatsCards";
import { PositionsTable } from "@/components/PositionsTable";
import { TradingOpportunities } from "@/components/TradingOpportunities";
import { StrategyPerformance } from "@/components/StrategyPerformance";
import { SummaryTab } from "@/components/SummaryTab";
import { BotLogTab } from "@/components/BotLogTab";
import { SystemErrorTab } from "@/components/SystemErrorTab";
import { SettingsTab } from "@/components/SettingsTab";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import type { Position, BotLog, SystemError, PortfolioData } from "@/lib/types";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tradingMode, setTradingMode] = useState<'spot' | 'leverage'>('spot');
  const [positions, setPositions] = useState<Position[]>([]);
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({ totalValue: '0', availableBalance: '0' });
  const { toast } = useToast();

  // Get initial trading mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('tradingMode') as 'spot' | 'leverage';
    if (savedMode) {
      setTradingMode(savedMode);
    }
  }, []);

  // Fetch dashboard data
  const { data: dashboardData, refetch: refetchDashboard } = useQuery({
    queryKey: ['/api/dashboard'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch portfolio data
  const { data: portfolio } = useQuery({
    queryKey: ['/api/portfolio'],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch trading settings for paper trading status
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    if (portfolio) {
      setPortfolioData(portfolio);
    }
  }, [portfolio]);

  useEffect(() => {
    if (dashboardData?.positions) {
      setPositions(dashboardData.positions);
    }
  }, [dashboardData]);

  // WebSocket for real-time updates
  useWebSocket({
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
          toast({
            title: "Position Closed",
            description: `${message.data.symbol} position closed with PnL: ${message.data.pnl}`,
          });
          refetchDashboard();
          break;
        
        case 'bot_log':
          // Real-time logs will be handled by BotLogTab component
          break;
        
        case 'system_error':
          toast({
            title: "System Error",
            description: message.data.title,
            variant: "destructive",
          });
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
      }
    },
    onError: () => {
      toast({
        title: "Connection Error",
        description: "Lost connection to trading server",
        variant: "destructive",
      });
    }
  });

  const handleModeChange = (mode: 'spot' | 'leverage') => {
    setTradingMode(mode);
    localStorage.setItem('tradingMode', mode);
  };

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

  const getModeDescription = () => {
    return tradingMode === 'spot' 
      ? 'Spot Trading - Buy low, sell high with USDT pairs'
      : 'Leverage Trading - Long and short positions with margin';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-crypto-dark-900 text-white">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tradingMode={tradingMode}
        onModeChange={handleModeChange}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-crypto-dark-800 border-b border-crypto-dark-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{getTabTitle()}</h2>
              <p className="text-gray-400">{getModeDescription()}</p>
              
              {/* Paper Trading Indicator */}
              {activeTab === 'dashboard' && settings && (settings.spotPaperTrading || settings.leveragePaperTrading) && (
                <div className="mt-2 flex items-center space-x-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-blue-300">
                    Paper Trading Active - {
                      settings.spotPaperTrading && settings.leveragePaperTrading
                        ? "Both Modes"
                        : settings.spotPaperTrading
                        ? "Spot Only"
                        : "Leverage Only"
                    }
                  </span>
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
              <StatsCards data={dashboardData?.stats} />
              <PositionsTable 
                positions={positions} 
                tradingMode={tradingMode}
                onPositionClose={refetchDashboard}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TradingOpportunities data={dashboardData?.opportunities} />
                <StrategyPerformance data={dashboardData?.performance} />
              </div>
            </div>
          )}

          {activeTab === 'summary' && <SummaryTab />}
          {activeTab === 'bot-log' && <BotLogTab />}
          {activeTab === 'system-error' && <SystemErrorTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
      </div>
    </div>
  );
}
