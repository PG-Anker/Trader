import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { TradingSummary, Trade } from "@/lib/types";

export function SummaryTab() {
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/summary'],
    refetchInterval: 30000,
  });

  const summary: TradingSummary = summaryData?.summary || {};
  const tradeHistory: Trade[] = summaryData?.tradeHistory || [];

  const formatPnL = (pnl: string) => {
    const value = parseFloat(pnl);
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  };

  const getPnLColor = (pnl: string) => {
    return parseFloat(pnl) >= 0 ? 'text-crypto-success' : 'text-crypto-danger';
  };

  const getDirectionBadge = (direction: string) => {
    switch (direction) {
      case 'UP':
        return <Badge className="direction-up">UP</Badge>;
      case 'LONG':
        return <Badge className="direction-long">LONG</Badge>;
      case 'SHORT':
        return <Badge className="direction-short">SHORT</Badge>;
      default:
        return <Badge>{direction}</Badge>;
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (summaryLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="trading-card">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="trading-card">
          <CardHeader>
            <CardTitle className="text-lg">Total Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Won Trades</span>
                <span className="text-crypto-success font-mono">{summary.wonTrades || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Lost Trades</span>
                <span className="text-crypto-danger font-mono">{summary.lostTrades || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Open Trades</span>
                <span className="text-crypto-warning font-mono">{summary.openTrades || 0}</span>
              </div>
              <div className="border-t border-crypto-dark-600 pt-3">
                <div className="flex justify-between">
                  <span className="font-medium">Win Rate</span>
                  <span className="text-crypto-success font-mono font-bold">{summary.overallWinRate || '0.0'}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="trading-card">
          <CardHeader>
            <CardTitle className="text-lg">Profit & Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Profit</span>
                <span className="text-crypto-success font-mono">+${summary.totalProfit || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Loss</span>
                <span className="text-crypto-danger font-mono">${summary.totalLoss || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Net P&L</span>
                <span className={`font-mono ${getPnLColor(summary.netPnL || '0')}`}>
                  {formatPnL(summary.netPnL || '0')}
                </span>
              </div>
              <div className="border-t border-crypto-dark-600 pt-3">
                <div className="flex justify-between">
                  <span className="font-medium">ROI</span>
                  <span className={`font-mono font-bold ${getPnLColor(summary.roi || '0')}`}>
                    {summary.roi || '0.0'}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="trading-card">
          <CardHeader>
            <CardTitle className="text-lg">Risk Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Avg. Win</span>
                <span className="text-crypto-success font-mono">${summary.avgWin || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg. Loss</span>
                <span className="text-crypto-danger font-mono">${summary.avgLoss || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max Drawdown</span>
                <span className="text-crypto-danger font-mono">${summary.maxDrawdown || '0.00'}</span>
              </div>
              <div className="border-t border-crypto-dark-600 pt-3">
                <div className="flex justify-between">
                  <span className="font-medium">Profit Factor</span>
                  <span className="text-crypto-success font-mono font-bold">{summary.profitFactor || '0.00'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trading History */}
      <Card className="trading-card">
        <CardHeader>
          <CardTitle className="text-lg">Recent Trading History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tradeHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No trading history available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-crypto-dark-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Symbol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Entry</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Exit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">P&L</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Strategy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-crypto-dark-600">
                  {tradeHistory.map((trade) => (
                    <tr key={trade.id} className="hover:bg-crypto-dark-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        {formatDate(trade.exitTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono">
                        {trade.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getDirectionBadge(trade.direction)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                        ${parseFloat(trade.entryPrice).toFixed(8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                        ${parseFloat(trade.exitPrice).toFixed(8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                        {parseFloat(trade.quantity).toFixed(4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDuration(trade.duration)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                        <span className={getPnLColor(trade.pnl)}>
                          {formatPnL(trade.pnl)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {trade.strategy || 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
