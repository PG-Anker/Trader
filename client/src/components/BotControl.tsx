import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Play, Square, Activity, Clock, User } from "lucide-react";

interface BotStatus {
  isRunning: boolean;
  startedAt: string | null;
  lastActivity: string | null;
  userId: number | null;
  type?: 'spot' | 'leverage';
}

interface BotControlProps {
  status: BotStatus;
  botType?: 'spot' | 'leverage';
  title?: string;
  description?: string;
}

export function BotControl({ status, botType, title, description }: BotControlProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const botActionMutation = useMutation({
    mutationFn: async (action: 'start' | 'stop') => {
      if (botType) {
        // Use dual bot API for independent control
        const response = await apiRequest('POST', `/api/bot/${botType}/${action}`);
        return response.json();
      } else {
        // Legacy API for backward compatibility
        const response = await apiRequest('POST', `/api/bot/${action}`);
        return response.json();
      }
    },
    onSuccess: (data, action) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot/status'] });
      const botName = botType ? `${botType.charAt(0).toUpperCase() + botType.slice(1)} bot` : 'Bot';
      toast({
        title: action === 'start' ? `${botName} Started` : `${botName} Stopped`,
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to control bot",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  const handleBotAction = (action: 'start' | 'stop') => {
    setIsLoading(true);
    botActionMutation.mutate(action);
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const getUptime = () => {
    if (!status.startedAt) return 'N/A';
    const start = new Date(status.startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  };

  return (
    <Card className="bg-crypto-dark-800 border-crypto-dark-600">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {title || 'Trading Bot Control'}
          </span>
          <Badge 
            variant={status.isRunning ? "default" : "secondary"}
            className={status.isRunning ? "bg-green-500 text-white" : "bg-gray-500 text-white"}
          >
            {status.isRunning ? "Running" : "Stopped"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bot Status Indicator */}
        <div className="flex items-center justify-between p-3 bg-crypto-dark-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              status.isRunning 
                ? "bg-green-400 animate-pulse" 
                : "bg-gray-400"
            }`}></div>
            <span className="font-medium">
              {status.isRunning ? 
                (description ? `${description} - Active` : "Bot is actively trading") : 
                (description ? `${description} - Offline` : "Bot is offline")
              }
            </span>
          </div>
        </div>

        {/* Bot Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="h-4 w-4" />
              <span>Started:</span>
            </div>
            <p className="font-mono">{formatTime(status.startedAt)}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-400">
              <Activity className="h-4 w-4" />
              <span>Last Activity:</span>
            </div>
            <p className="font-mono">{formatTime(status.lastActivity)}</p>
          </div>

          {status.isRunning && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>Uptime:</span>
                </div>
                <p className="font-mono text-green-400">{getUptime()}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-400">
                  <User className="h-4 w-4" />
                  <span>User ID:</span>
                </div>
                <p className="font-mono">{status.userId}</p>
              </div>
            </>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3 pt-2">
          {!status.isRunning ? (
            <Button
              onClick={() => handleBotAction('start')}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Bot
            </Button>
          ) : (
            <Button
              onClick={() => handleBotAction('stop')}
              disabled={isLoading}
              variant="destructive"
              className="flex-1"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Bot
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-400 bg-crypto-dark-700 p-3 rounded">
          {status.isRunning ? (
            "Bot is analyzing markets every 30 seconds and monitoring positions. Check the Bot Log tab for detailed activity."
          ) : (
            "Start the bot to begin automated market analysis and trading. Make sure your Bybit API credentials are configured in Settings first."
          )}
        </div>
      </CardContent>
    </Card>
  );
}