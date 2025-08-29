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

export default function BotLogs() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch bot logs
  const { data: logs = [], refetch, isLoading } = useQuery<BotLog[]>({
    queryKey: ['/api/bot-logs'],
    refetchInterval: autoRefresh ? 1000 : false, // Poll every 1 seconds for real-time updates
    staleTime: 0, // Always refetch to get fresh data
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
            <CardDescription>Real-time trading bot activity and decisions</CardDescription>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "Auto" : "Manual"}
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
        <ScrollArea className="h-full">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <div className="text-center">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No bot activity logs yet</p>
                <p className="text-sm">Logs will appear when the bot starts analyzing markets</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start space-x-3 p-2 rounded border-l-4 border-l-blue-500 bg-crypto-dark-800/50 hover:bg-crypto-dark-800 transition-colors text-xs"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getLogIcon(log.level)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs text-gray-400 font-mono min-w-[60px]">
                        {formatLogTime(log.createdAt)}
                      </span>
                      <Badge variant={getLogBadgeVariant(log.level)} className="text-xs px-1 py-0">
                        {log.level}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-gray-200 font-mono leading-relaxed">
                      {log.message}
                    </p>
                    
                    {log.details && (
                      <p className="text-xs text-gray-400 font-mono bg-crypto-dark-900 p-2 rounded border">
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}