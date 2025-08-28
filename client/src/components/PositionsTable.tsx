import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Position } from "@/lib/types";

interface PositionsTableProps {
  positions: Position[];
  onPositionClose?: () => void;
}

export function PositionsTable({ positions, onPositionClose }: PositionsTableProps) {
  const [closingPositions, setClosingPositions] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const closePositionMutation = useMutation({
    mutationFn: async (positionId: number) => {
      const response = await apiRequest('POST', `/api/positions/${positionId}/close`);
      return response.json();
    },
    onMutate: (positionId) => {
      setClosingPositions(prev => new Set(prev).add(positionId));
    },
    onSuccess: (data, positionId) => {
      toast({
        title: "Position Closed",
        description: `Position closed successfully. PnL: ${data.pnl > 0 ? '+' : ''}$${data.pnl.toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      onPositionClose?.();
    },
    onError: (error, positionId) => {
      toast({
        title: "Error",
        description: error.message || "Failed to close position",
        variant: "destructive",
      });
    },
    onSettled: (data, error, positionId) => {
      setClosingPositions(prev => {
        const newSet = new Set(prev);
        newSet.delete(positionId);
        return newSet;
      });
    }
  });

  const formatPrice = (price: string) => {
    return `$${parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
  };

  const formatPnL = (pnl: string) => {
    const value = parseFloat(pnl);
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  };

  const getPnLColor = (pnl: string) => {
    return parseFloat(pnl) >= 0 ? 'pnl-positive' : 'pnl-negative';
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

  const getActionButton = (position: Position) => {
    const isClosing = closingPositions.has(position.id);
    
    if (tradingMode === 'spot') {
      return (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => closePositionMutation.mutate(position.id)}
          disabled={isClosing}
        >
          {isClosing ? 'Selling...' : 'Sell'}
        </Button>
      );
    } else {
      return (
        <Button
          size="sm"
          onClick={() => closePositionMutation.mutate(position.id)}
          disabled={isClosing}
        >
          {isClosing ? 'Closing...' : 'Close'}
        </Button>
      );
    }
  };

  if (!positions || positions.length === 0) {
    return (
      <Card className="trading-card">
        <CardHeader>
          <CardTitle>Current Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-400">No open positions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="trading-card">
      <CardHeader>
        <CardTitle>Current Positions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-crypto-dark-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Direction</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Entry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Current</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Stop Loss</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Take Profit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">PnL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-crypto-dark-600">
              {positions.map((position) => (
                <tr key={position.id} className="hover:bg-crypto-dark-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono font-medium">{position.symbol}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getDirectionBadge(position.direction)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                    {formatPrice(position.entryPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                    {formatPrice(position.currentPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-crypto-danger">
                    {formatPrice(position.stopLoss)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-crypto-success">
                    {formatPrice(position.takeProfit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                    {parseFloat(position.quantity).toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                    <span className={getPnLColor(position.pnl)}>
                      {formatPnL(position.pnl)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={position.status === 'open' ? 'status-open' : 'status-closed'}>
                      {position.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getActionButton(position)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
