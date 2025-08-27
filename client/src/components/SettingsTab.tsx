import React, { useState } from "react";
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

const settingsSchema = z.object({
  usdtPerTrade: z.string().min(1, "USDT per trade is required"),
  maxPositions: z.number().min(1, "Max positions must be at least 1"),
  riskPerTrade: z.string().min(1, "Risk per trade is required"),
  stopLoss: z.string().min(1, "Stop loss is required"),
  takeProfit: z.string().min(1, "Take profit is required"),
  apiKey: z.string().optional(),
  secretKey: z.string().optional(),
  environment: z.enum(["mainnet"]),
  spotPaperTrading: z.boolean(),
  leveragePaperTrading: z.boolean(),
  aiTradingEnabled: z.boolean(),
  rsiPeriod: z.number().min(1, "RSI period must be at least 1"),
  rsiLow: z.number().min(1, "RSI low must be at least 1"),
  rsiHigh: z.number().min(1, "RSI high must be at least 1"),
  emaFast: z.number().min(1, "EMA fast must be at least 1"),
  emaSlow: z.number().min(1, "EMA slow must be at least 1"),
  macdSignal: z.number().min(1, "MACD signal must be at least 1"),
  adxPeriod: z.number().min(1, "ADX period must be at least 1"),
  timeframe: z.string().min(1, "Timeframe is required"),
  minConfidence: z.number().min(1, "Min confidence must be at least 1"),
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
      environment: "mainnet",
      spotPaperTrading: true,
      leveragePaperTrading: true,
      aiTradingEnabled: false,
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

  const testConnectionMutation = useMutation({
    mutationFn: async (data: { apiKey: string; secretKey: string }) => {
      const response = await apiRequest('POST', '/api/test-connection', data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setIsApiConnected(true);
        toast({
          title: "Connection Successful",
          description: "Bybit API connection established successfully",
        });
      } else {
        setIsApiConnected(false);
        toast({
          title: "Connection Failed",
          description: data.message || "Failed to connect to Bybit API",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      setIsApiConnected(false);
      toast({
        title: "Connection Error",
        description: "Failed to test connection. Please check your credentials.",
        variant: "destructive",
      });
    }
  });

  // Update form when settings data is loaded
  React.useEffect(() => {
    if (settings) {
      const formData: SettingsFormData = {
        usdtPerTrade: settings.usdtPerTrade || "100",
        maxPositions: settings.maxPositions || 10,
        riskPerTrade: settings.riskPerTrade || "2.5",
        stopLoss: settings.stopLoss || "3.0",
        takeProfit: settings.takeProfit || "6.0",
        apiKey: settings.apiKey || '',
        secretKey: settings.secretKey || '',
        environment: settings.environment || 'mainnet',
        spotPaperTrading: settings.spotPaperTrading ?? true,
        leveragePaperTrading: settings.leveragePaperTrading ?? true,
        aiTradingEnabled: settings.aiTradingEnabled ?? false,
        rsiPeriod: settings.rsiPeriod || 14,
        rsiLow: settings.rsiLow || 30,
        rsiHigh: settings.rsiHigh || 70,
        emaFast: settings.emaFast || 12,
        emaSlow: settings.emaSlow || 26,
        macdSignal: settings.macdSignal || 9,
        adxPeriod: settings.adxPeriod || 14,
        timeframe: settings.timeframe || "15m",
        minConfidence: settings.minConfidence || 75,
        strategies: typeof settings.strategies === 'string' 
          ? JSON.parse(settings.strategies) 
          : settings.strategies || {
              trendFollowing: true,
              meanReversion: true,
              breakoutTrading: false,
              pullbackTrading: true,
            }
      };
      form.reset(formData);
    }
    
    // Check if API is connected (has valid credentials)
    if (settings && settings.apiKey && settings.secretKey) {
      setIsApiConnected(true);
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
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: SettingsFormData) => {
    console.log('Submitting settings data:', data);
    saveSettingsMutation.mutate(data);
  };

  const testConnection = () => {
    const apiKey = form.getValues('apiKey');
    const secretKey = form.getValues('secretKey');
    
    if (!apiKey || !secretKey) {
      toast({
        title: "Missing Credentials",
        description: "Please enter both API Key and Secret Key",
        variant: "destructive",
      });
      return;
    }
    
    setIsTestingConnection(true);
    testConnectionMutation.mutate({ apiKey, secretKey });
    setTimeout(() => setIsTestingConnection(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Bybit API Configuration
            {isApiConnected && (
              <Badge variant="default" className="bg-green-500">
                Connected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your Bybit API key"
                {...form.register('apiKey')}
              />
            </div>
            <div>
              <Label htmlFor="secretKey">Secret Key</Label>
              <Input
                id="secretKey"
                type="password"
                placeholder="Enter your Bybit secret key"
                {...form.register('secretKey')}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="environment">Environment</Label>
            <Select 
              value={form.watch('environment')} 
              onValueChange={(value) => form.setValue('environment', value as 'mainnet')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mainnet">Mainnet (Live trading)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            type="button" 
            onClick={testConnection}
            disabled={isTestingConnection}
            className="w-full"
          >
            {isTestingConnection ? "Testing..." : "Test API Connection"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trading Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Paper Trading Mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="spotPaperTrading"
                    checked={form.watch('spotPaperTrading')}
                    onCheckedChange={(checked) => 
                      form.setValue('spotPaperTrading', !!checked)
                    }
                  />
                  <Label htmlFor="spotPaperTrading">Enable Paper Trading for Spot Trading</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="leveragePaperTrading"
                    checked={form.watch('leveragePaperTrading')}
                    onCheckedChange={(checked) => 
                      form.setValue('leveragePaperTrading', !!checked)
                    }
                  />
                  <Label htmlFor="leveragePaperTrading">Enable Paper Trading for Leverage Trading</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Paper trading simulates trades without using real money, even when connected to mainnet API.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Trading Mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="aiTradingEnabled"
                    checked={form.watch('aiTradingEnabled')}
                    onCheckedChange={(checked) => 
                      form.setValue('aiTradingEnabled', !!checked)
                    }
                  />
                  <Label htmlFor="aiTradingEnabled">Enable AI Trading with DeepSeek</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  When enabled, DeepSeek AI will analyze market data and make trading decisions instead of traditional technical indicators.
                </p>
                {form.watch('aiTradingEnabled') && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      ⚠️ AI trading requires stable internet connection and may be slower than traditional indicators.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="usdtPerTrade">USDT Per Trade</Label>
                <Input
                  id="usdtPerTrade"
                  placeholder="100"
                  {...form.register('usdtPerTrade')}
                />
              </div>
              <div>
                <Label htmlFor="maxPositions">Max Open Positions</Label>
                <Input
                  id="maxPositions"
                  type="number"
                  placeholder="10"
                  {...form.register('maxPositions', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="riskPerTrade">Risk Per Trade (%)</Label>
                <Input
                  id="riskPerTrade"
                  placeholder="2.5"
                  {...form.register('riskPerTrade')}
                />
              </div>
              <div>
                <Label htmlFor="stopLoss">Stop Loss (%)</Label>
                <Input
                  id="stopLoss"
                  placeholder="3.0"
                  {...form.register('stopLoss')}
                />
              </div>
              <div>
                <Label htmlFor="takeProfit">Take Profit (%)</Label>
                <Input
                  id="takeProfit"
                  placeholder="6.0"
                  {...form.register('takeProfit')}
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Technical Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="rsiPeriod">RSI Period</Label>
                    <Input
                      id="rsiPeriod"
                      type="number"
                      {...form.register('rsiPeriod', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rsiLow">RSI Low</Label>
                    <Input
                      id="rsiLow"
                      type="number"
                      {...form.register('rsiLow', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rsiHigh">RSI High</Label>
                    <Input
                      id="rsiHigh"
                      type="number"
                      {...form.register('rsiHigh', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="emaFast">EMA Fast</Label>
                    <Input
                      id="emaFast"
                      type="number"
                      {...form.register('emaFast', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emaSlow">EMA Slow</Label>
                    <Input
                      id="emaSlow"
                      type="number"
                      {...form.register('emaSlow', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="macdSignal">MACD Signal</Label>
                    <Input
                      id="macdSignal"
                      type="number"
                      {...form.register('macdSignal', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trading Strategies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="trendFollowing"
                    checked={form.watch('strategies.trendFollowing')}
                    onCheckedChange={(checked) => 
                      form.setValue('strategies.trendFollowing', !!checked)
                    }
                  />
                  <Label htmlFor="trendFollowing">Trend Following</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="meanReversion"
                    checked={form.watch('strategies.meanReversion')}
                    onCheckedChange={(checked) => 
                      form.setValue('strategies.meanReversion', !!checked)
                    }
                  />
                  <Label htmlFor="meanReversion">Mean Reversion</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="breakoutTrading"
                    checked={form.watch('strategies.breakoutTrading')}
                    onCheckedChange={(checked) => 
                      form.setValue('strategies.breakoutTrading', !!checked)
                    }
                  />
                  <Label htmlFor="breakoutTrading">Breakout Trading</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pullbackTrading"
                    checked={form.watch('strategies.pullbackTrading')}
                    onCheckedChange={(checked) => 
                      form.setValue('strategies.pullbackTrading', !!checked)
                    }
                  />
                  <Label htmlFor="pullbackTrading">Pullback Trading</Label>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timeframe">Timeframe</Label>
                <Select 
                  value={form.watch('timeframe')} 
                  onValueChange={(value) => form.setValue('timeframe', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1 Minute</SelectItem>
                    <SelectItem value="5m">5 Minutes</SelectItem>
                    <SelectItem value="15m">15 Minutes</SelectItem>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="4h">4 Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="minConfidence">Min Confidence (%)</Label>
                <Input
                  id="minConfidence"
                  type="number"
                  {...form.register('minConfidence', { valueAsNumber: true })}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={saveSettingsMutation.isPending}
            >
              {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}