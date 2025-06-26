import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { TradingSettings } from "@/lib/types";

const settingsSchema = z.object({
  usdtPerTrade: z.string().min(1, "USDT per trade is required"),
  maxPositions: z.number().min(1, "Max positions must be at least 1"),
  riskPerTrade: z.string().min(1, "Risk per trade is required"),
  stopLoss: z.string().min(1, "Stop loss is required"),
  takeProfit: z.string().min(1, "Take profit is required"),
  apiKey: z.string().optional(),
  secretKey: z.string().optional(),
  environment: z.enum(['testnet', 'mainnet']),
  rsiPeriod: z.number().min(2, "RSI period must be at least 2"),
  rsiLow: z.number().min(1).max(100, "RSI low must be between 1-100"),
  rsiHigh: z.number().min(1).max(100, "RSI high must be between 1-100"),
  emaFast: z.number().min(1, "EMA fast must be at least 1"),
  emaSlow: z.number().min(1, "EMA slow must be at least 1"),
  macdSignal: z.number().min(1, "MACD signal must be at least 1"),
  adxPeriod: z.number().min(2, "ADX period must be at least 2"),
  timeframe: z.string().min(1, "Timeframe is required"),
  minConfidence: z.number().min(0).max(100, "Confidence must be between 0-100"),
  strategies: z.object({
    trendFollowing: z.boolean(),
    meanReversion: z.boolean(),
    breakoutTrading: z.boolean(),
    pullbackTrading: z.boolean(),
  })
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export function SettingsTab() {
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings'],
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      usdtPerTrade: "100",
      maxPositions: 10,
      riskPerTrade: "2.5",
      stopLoss: "3.0",
      takeProfit: "6.0",
      environment: "testnet",
      rsiPeriod: 14,
      rsiLow: 30,
      rsiHigh: 70,
      emaFast: 12,
      emaSlow: 26,
      macdSignal: 9,
      adxPeriod: 14,
      timeframe: "15m",
      minConfidence: 75,
      strategies: {
        trendFollowing: true,
        meanReversion: true,
        breakoutTrading: false,
        pullbackTrading: true,
      }
    }
  });

  // Update form when settings data is loaded
  React.useEffect(() => {
    if (settings) {
      const formData: SettingsFormData = {
        usdtPerTrade: settings.usdtPerTrade,
        maxPositions: settings.maxPositions,
        riskPerTrade: settings.riskPerTrade,
        stopLoss: settings.stopLoss,
        takeProfit: settings.takeProfit,
        apiKey: settings.apiKey || '',
        secretKey: settings.secretKey || '',
        environment: settings.environment,
        rsiPeriod: settings.rsiPeriod,
        rsiLow: settings.rsiLow,
        rsiHigh: settings.rsiHigh,
        emaFast: settings.emaFast,
        emaSlow: settings.emaSlow,
        macdSignal: settings.macdSignal,
        adxPeriod: settings.adxPeriod,
        timeframe: settings.timeframe,
        minConfidence: settings.minConfidence,
        strategies: settings.strategies || {
          trendFollowing: true,
          meanReversion: true,
          breakoutTrading: false,
          pullbackTrading: true,
        }
      };
      form.reset(formData);
      setIsApiConnected(!!settings.apiKey && !!settings.secretKey);
    }
  }, [settings, form]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const response = await apiRequest('POST', '/api/settings', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings Saved",
        description: "Trading settings have been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    }
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/test-connection');
      return response.json();
    },
    onMutate: () => {
      setIsTestingConnection(true);
    },
    onSuccess: (data) => {
      setIsApiConnected(data.success);
      toast({
        title: data.success ? "Connection Successful" : "Connection Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error) => {
      setIsApiConnected(false);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to test connection",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsTestingConnection(false);
    }
  });

  const onSubmit = (data: SettingsFormData) => {
    saveSettingsMutation.mutate(data);
  };

  const resetToDefaults = () => {
    form.reset();
    toast({
      title: "Settings Reset",
      description: "Settings have been reset to default values",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="trading-card">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trading Parameters */}
        <Card className="trading-card">
          <CardHeader>
            <CardTitle className="text-lg">Trading Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="usdtPerTrade">USDT per Trade</Label>
              <Input
                id="usdtPerTrade"
                type="number"
                step="0.01"
                className="trading-input"
                {...form.register('usdtPerTrade')}
              />
            </div>
            <div>
              <Label htmlFor="maxPositions">Maximum Open Positions</Label>
              <Input
                id="maxPositions"
                type="number"
                className="trading-input"
                {...form.register('maxPositions', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="riskPerTrade">Risk per Trade (%)</Label>
              <Input
                id="riskPerTrade"
                type="number"
                step="0.1"
                className="trading-input"
                {...form.register('riskPerTrade')}
              />
            </div>
            <div>
              <Label htmlFor="stopLoss">Stop Loss (%)</Label>
              <Input
                id="stopLoss"
                type="number"
                step="0.1"
                className="trading-input"
                {...form.register('stopLoss')}
              />
            </div>
            <div>
              <Label htmlFor="takeProfit">Take Profit (%)</Label>
              <Input
                id="takeProfit"
                type="number"
                step="0.1"
                className="trading-input"
                {...form.register('takeProfit')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Technical Indicators */}
        <Card className="trading-card">
          <CardHeader>
            <CardTitle className="text-lg">Technical Indicators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rsiPeriod">RSI Period</Label>
                <Input
                  id="rsiPeriod"
                  type="number"
                  className="trading-input"
                  {...form.register('rsiPeriod', { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label>RSI Threshold</Label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Low"
                    type="number"
                    className="trading-input"
                    {...form.register('rsiLow', { valueAsNumber: true })}
                  />
                  <Input
                    placeholder="High"
                    type="number"
                    className="trading-input"
                    {...form.register('rsiHigh', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emaFast">EMA Fast</Label>
                <Input
                  id="emaFast"
                  type="number"
                  className="trading-input"
                  {...form.register('emaFast', { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="emaSlow">EMA Slow</Label>
                <Input
                  id="emaSlow"
                  type="number"
                  className="trading-input"
                  {...form.register('emaSlow', { valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="macdSignal">MACD Signal</Label>
                <Input
                  id="macdSignal"
                  type="number"
                  className="trading-input"
                  {...form.register('macdSignal', { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="adxPeriod">ADX Period</Label>
                <Input
                  id="adxPeriod"
                  type="number"
                  className="trading-input"
                  {...form.register('adxPeriod', { valueAsNumber: true })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card className="trading-card">
          <CardHeader>
            <CardTitle className="text-lg">Bybit API Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your Bybit API key"
                className="trading-input"
                {...form.register('apiKey')}
              />
            </div>
            <div>
              <Label htmlFor="secretKey">Secret Key</Label>
              <Input
                id="secretKey"
                type="password"
                placeholder="Enter your secret key"
                className="trading-input"
                {...form.register('secretKey')}
              />
            </div>
            <div>
              <Label htmlFor="environment">Environment</Label>
              <Select 
                value={form.watch('environment')} 
                onValueChange={(value) => form.setValue('environment', value as 'testnet' | 'mainnet')}
              >
                <SelectTrigger className="trading-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="testnet">Testnet (Demo)</SelectItem>
                  <SelectItem value="mainnet">Mainnet (Live)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isApiConnected ? 'bg-crypto-success' : 'bg-gray-500'}`}></div>
                <span className={`text-sm ${isApiConnected ? 'text-crypto-success' : 'text-gray-400'}`}>
                  {isApiConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => testConnectionMutation.mutate()}
                disabled={isTestingConnection}
              >
                {isTestingConnection ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Strategy Settings */}
        <Card className="trading-card">
          <CardHeader>
            <CardTitle className="text-lg">Strategy Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Active Strategies</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={form.watch('strategies.trendFollowing')}
                    onCheckedChange={(checked) => 
                      form.setValue('strategies.trendFollowing', !!checked)
                    }
                  />
                  <Label>Trend Following</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={form.watch('strategies.meanReversion')}
                    onCheckedChange={(checked) => 
                      form.setValue('strategies.meanReversion', !!checked)
                    }
                  />
                  <Label>Mean Reversion</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={form.watch('strategies.breakoutTrading')}
                    onCheckedChange={(checked) => 
                      form.setValue('strategies.breakoutTrading', !!checked)
                    }
                  />
                  <Label>Breakout Trading</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={form.watch('strategies.pullbackTrading')}
                    onCheckedChange={(checked) => 
                      form.setValue('strategies.pullbackTrading', !!checked)
                    }
                  />
                  <Label>Pullback Trading</Label>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select 
                value={form.watch('timeframe')} 
                onValueChange={(value) => form.setValue('timeframe', value)}
              >
                <SelectTrigger className="trading-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Minute</SelectItem>
                  <SelectItem value="5m">5 Minutes</SelectItem>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="4h">4 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="minConfidence">Minimum Confidence (%)</Label>
              <Input
                id="minConfidence"
                type="number"
                className="trading-input"
                {...form.register('minConfidence', { valueAsNumber: true })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Settings */}
      <div className="flex justify-end space-x-4">
        <Button 
          type="button" 
          variant="outline"
          onClick={resetToDefaults}
        >
          Reset to Defaults
        </Button>
        <Button 
          type="submit"
          disabled={saveSettingsMutation.isPending}
        >
          {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
}
