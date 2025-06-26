import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertTriangle, XCircle, Info, Shield } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SystemError } from "@/lib/types";

export function SystemErrorTab() {
  const [errors, setErrors] = useState<SystemError[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: initialErrors, isLoading } = useQuery({
    queryKey: ['/api/system-errors'],
  });

  useEffect(() => {
    if (initialErrors) {
      setErrors(initialErrors);
    }
  }, [initialErrors]);

  // WebSocket for real-time error updates
  useWebSocket({
    onMessage: (message) => {
      if (message.type === 'system_error') {
        setErrors(prev => [message.data, ...prev]);
      }
    }
  });

  const resolveErrorMutation = useMutation({
    mutationFn: async (errorId: number) => {
      const response = await apiRequest('POST', `/api/system-errors/${errorId}/resolve`);
      return response.json();
    },
    onSuccess: (data, errorId) => {
      setErrors(prev => 
        prev.map(error => 
          error.id === errorId ? { ...error, resolved: true } : error
        )
      );
      toast({
        title: "Error Resolved",
        description: "System error has been marked as resolved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resolve error",
        variant: "destructive",
      });
    }
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
        return <XCircle className="w-5 h-5 text-crypto-danger" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-crypto-warning" />;
      case 'INFO':
        return <Info className="w-5 h-5 text-primary" />;
      default:
        return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'border-crypto-danger bg-crypto-danger bg-opacity-10';
      case 'WARNING':
        return 'border-crypto-warning bg-crypto-warning bg-opacity-10';
      case 'INFO':
        return 'border-primary bg-primary bg-opacity-10';
      default:
        return 'border-gray-600 bg-gray-600 bg-opacity-10';
    }
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

  const unresolvedErrors = errors.filter(error => !error.resolved);
  const isSystemHealthy = unresolvedErrors.length === 0;

  if (isLoading) {
    return (
      <Card className="trading-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Skeleton className="w-5 h-5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
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
          <CardTitle className="text-lg">System Errors & Alerts</CardTitle>
          <div className="flex items-center space-x-2">
            {isSystemHealthy ? (
              <Badge className="bg-crypto-success bg-opacity-20 text-crypto-success border-crypto-success">
                <CheckCircle className="w-4 h-4 mr-1" />
                System Healthy
              </Badge>
            ) : (
              <Badge className="bg-crypto-danger bg-opacity-20 text-crypto-danger border-crypto-danger">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {unresolvedErrors.length} Active Issues
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto">
          {errors.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-16 h-16 text-crypto-success mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-crypto-success mb-2">All Systems Operational</h4>
              <p className="text-gray-400">No errors or warnings to display</p>
            </div>
          ) : (
            <div className="space-y-4">
              {errors.map((error) => (
                <div 
                  key={error.id} 
                  className={`border rounded-lg p-4 ${getLevelColor(error.level)} ${
                    error.resolved ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {getLevelIcon(error.level)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`font-semibold ${
                            error.level === 'ERROR' ? 'text-crypto-danger' :
                            error.level === 'WARNING' ? 'text-crypto-warning' :
                            'text-primary'
                          }`}>
                            {error.title}
                          </span>
                          {error.resolved && (
                            <Badge className="bg-crypto-success bg-opacity-20 text-crypto-success text-xs">
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatDate(error.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{error.message}</p>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-400">
                          {error.source && <span>Source: {error.source}</span>}
                          {error.errorCode && <span className="ml-4">Code: {error.errorCode}</span>}
                        </div>
                        {!error.resolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveErrorMutation.mutate(error.id)}
                            disabled={resolveErrorMutation.isPending}
                            className="text-xs"
                          >
                            Mark Resolved
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
