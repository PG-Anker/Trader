import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, RefreshCw, AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface BotLog {
  id: number;
  userId: number;
  level: string;
  message: string;
  createdAt: string;
  details?: string;
}

export default function BotLogsPolling() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch bot logs with fast polling for real-time updates
  const { data: logs = [], refetch, isLoading, error } = useQuery<BotLog[]>({
    queryKey: ['/api/bot-logs'],
    refetchInterval: autoRefresh ? 2000 : false, // Poll every 2 seconds
    staleTime: 0, // Always fetch fresh data
    retry: 3,
  });

  const getLogIcon = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'WARN':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'SUCCESS':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getLogBadgeVariant = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return 'destructive';
      case 'WARN':
        return 'secondary';
      case 'SUCCESS':
        return 'default';
      default:
        return 'outline';
    }
  };

  const formatLogTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'HH:mm:ss');
    } catch {
      return timestamp.slice(11, 19); // fallback to simple string slice
    }
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center space-x-2">
          <Terminal className="w-5 h-5" />
          <div>
            <CardTitle className="text-lg">Bot Activity Logs</CardTitle>
            <CardDescription>Real-time trading bot activity via API polling</CardDescription>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        {error && (
          <div className="flex items-center justify-center h-full text-red-400">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Error loading logs: {error.message}
          </div>
        )}
        
        {!error && (
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {logs.length === 0 && !isLoading && (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <Info className="w-5 h-5 mr-2" />
                  No logs available. Start the bot to see activity.
                </div>
              )}
              
              {isLoading && logs.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Loading bot logs...
                </div>
              )}
              
              {logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    {getLogIcon(log.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Badge variant={getLogBadgeVariant(log.level) as any} className="text-xs">
                        {log.level.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatLogTime(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm mt-1 break-words">{log.message}</p>
                    {log.details && (
                      <pre className="text-xs mt-2 p-2 rounded bg-muted overflow-x-auto">
                        {log.details}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}