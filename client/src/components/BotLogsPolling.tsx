import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, RefreshCw, AlertTriangle, Info, CheckCircle, XCircle, Play, Pause, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface BotLog {
  id: number;
  userId: number;
  level: string;
  message: string;
  createdAt: string;
  symbol?: string | null;
  data?: string;
  details?: string;
}

export default function BotLogsPolling() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState<BotLog[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const maxLogs = 300; // Keep last 300 logs

  // Force refresh to bypass browser caching
  useEffect(() => {
    if (autoRefresh && !isPaused) {
      const interval = setInterval(() => {
        setRefreshKey(prev => prev + 1);
      }, 1000); // Update cache key every 1 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, isPaused]);

  // Fetch bot logs with cache busting for real-time updates
  const { data: logs = [], refetch, isLoading, error } = useQuery<BotLog[]>({
    queryKey: ['/api/bot-logs', refreshKey], // Cache busting with refresh counter
    refetchInterval: (autoRefresh && !isPaused) ? 2000 : false, // Poll every 2 seconds when not paused
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache at all
    retry: 3,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    enabled: !isPaused // Disable fetching when paused
  });

  // Update terminal logs when new data arrives (rolling terminal effect)
  useEffect(() => {
    if (logs && logs.length > 0 && !isPaused) {
      setTerminalLogs(prevLogs => {
        // Merge new logs with existing ones, avoiding duplicates
        const existingIds = new Set(prevLogs.map(log => log.id));
        const newLogs = logs.filter(log => !existingIds.has(log.id));
        
        if (newLogs.length > 0) {
          const updatedLogs = [...newLogs, ...prevLogs].slice(0, maxLogs);
          return updatedLogs;
        }
        return prevLogs;
      });
    }
  }, [logs, isPaused]);

  // Auto-scroll to top when new logs arrive (like terminal behavior)
  useEffect(() => {
    if (scrollAreaRef.current && !isPaused) {
      scrollAreaRef.current.scrollTop = 0;
    }
  }, [terminalLogs, isPaused]);

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
      // Handle SQLite CURRENT_TIMESTAMP format
      if (timestamp === "CURRENT_TIMESTAMP") {
        return new Date().toLocaleTimeString();
      }
      return format(new Date(timestamp), 'HH:mm:ss');
    } catch {
      return new Date().toLocaleTimeString(); // fallback to current time
    }
  };

  const clearLogs = async () => {
    if (confirm('Clear all bot logs?')) {
      try {
        await fetch('/api/bot-logs', { 
          method: 'DELETE',
          headers: {
            'X-Session-ID': localStorage.getItem('sessionId') || ''
          }
        });
        setTerminalLogs([]);
        refetch();
      } catch (error) {
        console.error('Failed to clear logs:', error);
      }
    }
  };

  return (
    <Card className="h-[600px] flex flex-col bg-gray-900 text-green-400 font-mono">
      <CardHeader className="flex-shrink-0 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-green-400" />
            <CardTitle className="text-green-400">Bot Terminal - Real-time Analysis</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={isPaused ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="border-green-400 text-green-400 hover:bg-green-400 hover:text-gray-900"
            >
              {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
              className="border-red-400 text-red-400 hover:bg-red-400 hover:text-gray-900"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isPaused}
              className="border-green-400 text-green-400 hover:bg-green-400 hover:text-gray-900"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="text-xs text-green-300">
          {isPaused ? 'PAUSED' : 'LIVE'} • Logs: {terminalLogs.length} • {error ? 'ERROR' : 'OK'}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden bg-black p-2">
        {error && (
          <div className="flex items-center justify-center h-full text-red-400">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Error loading logs: {error.message}
          </div>
        )}
        
        {!error && (
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="space-y-1 font-mono text-sm">
              {terminalLogs.length === 0 && !isLoading && (
                <div className="flex items-center justify-center h-32 text-green-400">
                  <Terminal className="w-5 h-5 mr-2" />
                  {isPaused ? 'Terminal Paused - Click Resume to continue' : 'Waiting for bot data...'}
                </div>
              )}
              
              {isLoading && terminalLogs.length === 0 && (
                <div className="flex items-center justify-center h-32 text-green-400">
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Connecting to bot terminal...
                </div>
              )}
              
              {terminalLogs.map((log) => (
                <div key={log.id} className="flex items-start space-x-2 py-1 hover:bg-gray-800 transition-colors">
                  <span className="text-gray-500 text-xs w-16 flex-shrink-0">
                    {formatLogTime(log.createdAt)}
                  </span>
                  <span className={`text-xs px-1 rounded ${
                    log.level === 'ERROR' ? 'bg-red-900 text-red-300' :
                    log.level === 'WARN' ? 'bg-yellow-900 text-yellow-300' :
                    log.level === 'SUCCESS' ? 'bg-green-900 text-green-300' :
                    log.level === 'ANALYSIS' ? 'bg-blue-900 text-blue-300' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {log.level}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-green-400 break-words">{log.message}</span>
                    {log.symbol && (
                      <span className="text-cyan-400 ml-2">[{log.symbol}]</span>
                    )}
                    {(log.details || log.data) && (
                      <div className="text-gray-400 text-xs mt-1 pl-4 border-l border-gray-600">
                        {log.details || log.data}
                      </div>
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