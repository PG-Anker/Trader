import { Card, CardContent } from "@/components/ui/card";
import { ChartLine, DollarSign, Percent, PlayCircle } from "lucide-react";
import type { TradingStats } from "@/lib/types";

interface StatsCardsProps {
  data?: TradingStats;
}

export function StatsCards({ data }: StatsCardsProps) {
  const defaultStats = {
    openPositions: 0,
    todayPnL: '0.00',
    winRate: '0.0',
    activeTrades: 0
  };

  const stats = data || defaultStats;

  const formatPnL = (pnl: string) => {
    const value = parseFloat(pnl);
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  };

  const getPnLColor = (pnl: string) => {
    return parseFloat(pnl) >= 0 ? 'text-crypto-success' : 'text-crypto-danger';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="trading-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Open Positions</p>
              <p className="text-2xl font-bold">{stats.openPositions}</p>
            </div>
            <ChartLine className="w-6 h-6 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card className="trading-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Today's PnL</p>
              <p className={`text-2xl font-bold font-mono ${getPnLColor(stats.todayPnL)}`}>
                {formatPnL(stats.todayPnL)}
              </p>
            </div>
            <DollarSign className={`w-6 h-6 ${getPnLColor(stats.todayPnL)}`} />
          </div>
        </CardContent>
      </Card>

      <Card className="trading-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Win Rate</p>
              <p className="text-2xl font-bold text-crypto-warning">{stats.winRate}%</p>
            </div>
            <Percent className="w-6 h-6 text-crypto-warning" />
          </div>
        </CardContent>
      </Card>

      <Card className="trading-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Trades</p>
              <p className="text-2xl font-bold">{stats.activeTrades}</p>
            </div>
            <PlayCircle className="w-6 h-6 text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
