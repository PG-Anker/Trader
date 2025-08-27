import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, RefreshCw, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface SystemError {
  id: number;
  userId: number;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  resolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

export default function SystemErrors() {
  const [showResolved, setShowResolved] = useState(false);

  // Fetch system errors
  const { data: errors = [], refetch, isLoading } = useQuery({
    queryKey: ['/api/system-errors', { showResolved }],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unresolvedErrors = errors.filter((error: SystemError) => !error.resolved);
  const resolvedErrors = errors.filter((error: SystemError) => error.resolved);

  const formatErrorTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'MMM dd, HH:mm:ss');
    } catch {
      return timestamp;
    }
  };

  const getErrorIcon = (resolved: boolean) => {
    return resolved ? (
      <CheckCircle className="w-4 h-4 text-green-400" />
    ) : (
      <XCircle className="w-4 h-4 text-red-400" />
    );
  };

  const displayErrors = showResolved ? errors : unresolvedErrors;

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <CardTitle className="text-lg">System Errors</CardTitle>
            <CardDescription>Bot and system error monitoring</CardDescription>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {unresolvedErrors.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {unresolvedErrors.length} Active
            </Badge>
          )}
          <Button
            variant={showResolved ? "default" : "outline"}
            size="sm"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? "All" : "Active"}
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
          {displayErrors.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <div className="text-center">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p className="font-medium">No {showResolved ? '' : 'active '}errors</p>
                <p className="text-sm">System is running smoothly</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {displayErrors.map((error: SystemError) => (
                <div
                  key={error.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    error.resolved
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getErrorIcon(error.resolved)}
                      <Badge variant={error.resolved ? "outline" : "destructive"} className="text-xs">
                        {error.errorType}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatErrorTime(error.createdAt)}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-200 mb-2">
                    {error.errorMessage}
                  </p>
                  
                  {error.stackTrace && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                        Stack Trace
                      </summary>
                      <pre className="text-xs text-gray-400 font-mono bg-crypto-dark-900 p-2 rounded mt-1 overflow-x-auto">
                        {error.stackTrace}
                      </pre>
                    </details>
                  )}
                  
                  {error.resolved && error.resolvedAt && (
                    <p className="text-xs text-green-400 mt-2">
                      Resolved: {formatErrorTime(error.resolvedAt)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}