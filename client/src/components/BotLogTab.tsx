import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { BotLog } from "@/lib/types";

export function BotLogTab() {
  const [logs, setLogs] = useState<BotLog[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: initialLogs, isLoading } = useQuery({
    queryKey: ['/api/bot-logs'],
  });

  useEffect(() => {
    if (initialLogs) {
      setLogs(initialLogs);
    }
  }, [initialLogs]);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // WebSocket for real-time log updates
  useWebSocket({
    onMessage: (message) => {
      if (message.type === 'bot_log') {
        setLogs(prev => [message.data, ...prev].slice(0, 100)); // Keep last 100 logs
      }
    }
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', '/api/bot-logs');
    },
    onSuccess: () => {
      setLogs([]);
      queryClient.invalidateQueries({ queryKey: ['/api/bot-logs'] });
      toast({
        title: "Logs Cleared",
        description: "Bot activity logs have been cleared successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear logs",
        variant: "destructive",
      });
    }
  });

  const getLevelBadge = (level: string) => {
    const levelColors = {
      'INFO': 'bg-gray-600 bg-opacity-20 text-gray-400',
      'ANALYSIS': 'bg-primary bg-opacity-20 text-primary',
      'SIGNAL': 'bg-crypto-success bg-opacity-20 text-crypto-success',
      'TRADE': 'bg-crypto-warning bg-opacity-20 text-crypto-warning',
      'ORDER': 'bg-crypto-success bg-opacity-20 text-crypto-success',
      'MONITOR': 'bg-primary bg-opacity-20 text-primary',
      'SCAN': 'bg-gray-600 bg-opacity-20 text-gray-400',
      'STRATEGY': 'bg-crypto-warning bg-opacity-20 text-crypto-warning',
      'ERROR': 'bg-crypto-danger bg-opacity-20 text-crypto-danger'
    };

    const colorClass = levelColors[level as keyof typeof levelColors] || 'bg-gray-600 bg-opacity-20 text-gray-400';

    return (
      <Badge className={`${colorClass} text-xs px-2 py-1 rounded font-medium`}>
        {level}
      </Badge>
    );
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card className="trading-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="trading-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Bot Activity Log</CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => clearLogsMutation.mutate()}
            disabled={clearLogsMutation.isPending}
            className="bg-crypto-danger hover:bg-red-600 text-white border-crypto-danger"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {clearLogsMutation.isPending ? 'Clearing...' : 'Clear Log'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No bot activity logs</p>
              <p className="text-sm text-gray-500 mt-2">Logs will appear here when the bot is active</p>
            </div>
          ) : (
            <div className="space-y-3 font-mono text-sm">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3">
                  <span className="text-gray-400 text-xs whitespace-nowrap mt-1">
                    {formatTime(log.createdAt)}
                  </span>
                  {getLevelBadge(log.level)}
                  <span className="text-gray-300 flex-1">
                    {log.symbol && (
                      <span className="text-crypto-warning mr-2">[{log.symbol}]</span>
                    )}
                    {log.message}
                    {log.data && Object.keys(log.data).length > 0 && (
                      <span className="text-gray-500 ml-2">
                        {Object.entries(log.data).map(([key, value]) => (
                          <span key={key} className="mr-2">
                            {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
