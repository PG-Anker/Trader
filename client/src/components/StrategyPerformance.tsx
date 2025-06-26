import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StrategyPerformance } from "@/lib/types";

interface StrategyPerformanceProps {
  data?: StrategyPerformance[];
}

export function StrategyPerformance({ data }: StrategyPerformanceProps) {
  const strategies = data || [];

  const getPerformanceColor = (winRate: number) => {
    if (winRate >= 80) return 'bg-crypto-success';
    if (winRate >= 65) return 'bg-crypto-warning';
    return 'bg-gray-600';
  };

  return (
    <Card className="trading-card">
      <CardHeader>
        <CardTitle>Strategy Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {strategies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No strategy data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {strategies.map((strategy, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-300">{strategy.strategy}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-crypto-dark-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getPerformanceColor(strategy.winRate)}`}
                      style={{ width: `${strategy.winRate}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-mono">{strategy.winRate}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
