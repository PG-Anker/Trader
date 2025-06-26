import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TradingOpportunity } from "@/lib/types";

interface TradingOpportunitiesProps {
  data?: TradingOpportunity[];
}

export function TradingOpportunities({ data }: TradingOpportunitiesProps) {
  const opportunities = data || [];

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 85) {
      return <Badge className="bg-crypto-success bg-opacity-20 text-crypto-success">+{confidence}% Confidence</Badge>;
    } else if (confidence >= 70) {
      return <Badge className="bg-crypto-warning bg-opacity-20 text-crypto-warning">+{confidence}% Confidence</Badge>;
    } else {
      return <Badge className="bg-gray-600 bg-opacity-20 text-gray-400">+{confidence}% Confidence</Badge>;
    }
  };

  return (
    <Card className="trading-card">
      <CardHeader>
        <CardTitle>Trading Opportunities</CardTitle>
      </CardHeader>
      <CardContent>
        {opportunities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No opportunities found</p>
            <p className="text-sm text-gray-500 mt-2">The bot is analyzing market conditions...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opportunity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-crypto-dark-700 rounded-lg">
                <div>
                  <p className="font-mono font-medium">{opportunity.symbol}</p>
                  <p className="text-sm text-gray-400">{opportunity.description}</p>
                </div>
                <div className="text-right">
                  {getConfidenceBadge(opportunity.confidence)}
                  <p className="text-xs text-gray-400 mt-1">{opportunity.indicators}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
