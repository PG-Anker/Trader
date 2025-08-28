import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Bot, TrendingUp, TrendingDown, Brain, Settings } from 'lucide-react';

interface TradingSettings {
  id: number;
  userId: number;
  usdtPerTrade: string;
  maxPositions: number;
  riskPerTrade: string;
  stopLoss: string;
  takeProfit: string;
  apiKey?: string;
  secretKey?: string;
  environment: string;
  spotPaperTrading: boolean;
  leveragePaperTrading: boolean;
  rsiPeriod: number;
  rsiLow: number;
  rsiHigh: number;
  emaFast: number;
  emaSlow: number;
  macdSignal: number;
  adxPeriod: number;
  strategies: string;
  spotStrategies: string;
  leverageStrategies: string;
  spotAiTradingEnabled: boolean;
  leverageAiTradingEnabled: boolean;
  timeframe: string;
  minConfidence: number;
}

export default function DualBotSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingUpdates, setPendingUpdates] = useState<Partial<TradingSettings>>({});

  const { data: settings, isLoading } = useQuery<TradingSettings>({
    queryKey: ['/api/settings'],
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<TradingSettings>) => {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update settings');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      setPendingUpdates({});
      toast({
        title: 'Settings Updated',
        description: 'Bot settings have been saved successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update settings',
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (key: keyof TradingSettings, value: any) => {
    setPendingUpdates(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(pendingUpdates);
  };

  const hasChanges = Object.keys(pendingUpdates).length > 0;
  const currentSettings = { ...settings, ...pendingUpdates };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  if (!settings) {
    return <div>Failed to load settings</div>;
  }

  const parseStrategies = (strategies: string) => {
    try {
      return JSON.parse(strategies);
    } catch {
      return {};
    }
  };

  const spotStrategies = parseStrategies(currentSettings.spotStrategies || '{}');
  const leverageStrategies = parseStrategies(currentSettings.leverageStrategies || '{}');

  const handleStrategyToggle = (botType: 'spot' | 'leverage', strategy: string, enabled: boolean) => {
    const currentStrategies = botType === 'spot' ? spotStrategies : leverageStrategies;
    const newStrategies = { ...currentStrategies, [strategy]: enabled };
    const key = botType === 'spot' ? 'spotStrategies' : 'leverageStrategies';
    handleInputChange(key as keyof TradingSettings, JSON.stringify(newStrategies));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dual Bot Configuration</h2>
        {hasChanges && (
          <Button 
            onClick={handleSave} 
            disabled={updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="spot" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Spot Bot
          </TabsTrigger>
          <TabsTrigger value="leverage" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Leverage Bot
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            API & Risk
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Trading Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeframe">Timeframe</Label>
                  <select
                    id="timeframe"
                    value={currentSettings.timeframe}
                    onChange={(e) => handleInputChange('timeframe', e.target.value)}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 text-black dark:text-white"
                  >
                    <option value="1m">1 minute</option>
                    <option value="5m">5 minutes</option>
                    <option value="15m">15 minutes</option>
                    <option value="1h">1 hour</option>
                    <option value="4h">4 hours</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="environment">Environment</Label>
                  <select
                    id="environment"
                    value={currentSettings.environment}
                    onChange={(e) => handleInputChange('environment', e.target.value)}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 text-black dark:text-white"
                  >
                    <option value="mainnet">Mainnet (Live Trading)</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="usdtPerTrade">USDT per Trade</Label>
                  <Input
                    id="usdtPerTrade"
                    type="number"
                    value={currentSettings.usdtPerTrade}
                    onChange={(e) => handleInputChange('usdtPerTrade', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="maxPositions">Max Positions</Label>
                  <Input
                    id="maxPositions"
                    type="number"
                    value={currentSettings.maxPositions}
                    onChange={(e) => handleInputChange('maxPositions', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="minConfidence">Min Confidence (%)</Label>
                  <Input
                    id="minConfidence"
                    type="number"
                    value={currentSettings.minConfidence}
                    onChange={(e) => handleInputChange('minConfidence', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spot" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Spot Trading Bot Configuration
                <Badge variant="outline" className="text-green-600">Buy Low, Sell High</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="spotPaperTrading">Paper Trading Mode</Label>
                  <p className="text-sm text-gray-500">Practice with virtual money</p>
                </div>
                <Switch
                  id="spotPaperTrading"
                  checked={currentSettings.spotPaperTrading}
                  onCheckedChange={(checked) => handleInputChange('spotPaperTrading', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <div>
                    <Label htmlFor="spotAiTradingEnabled">AI Trading (DeepSeek)</Label>
                    <p className="text-sm text-gray-500">Enable AI-powered market analysis</p>
                  </div>
                </div>
                <Switch
                  id="spotAiTradingEnabled"
                  checked={currentSettings.spotAiTradingEnabled}
                  onCheckedChange={(checked) => handleInputChange('spotAiTradingEnabled', checked)}
                />
              </div>

              <Separator />

              <div>
                <Label>Spot Trading Strategies</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                    { key: 'trendFollowing', label: 'Trend Following', description: 'Follow market trends' },
                    { key: 'meanReversion', label: 'Mean Reversion', description: 'Buy dips, sell peaks' },
                    { key: 'breakoutTrading', label: 'Breakout Trading', description: 'Trade on price breakouts' },
                    { key: 'pullbackTrading', label: 'Pullback Trading', description: 'Enter on pullbacks' },
                  ].map((strategy) => (
                    <div key={strategy.key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{strategy.label}</p>
                        <p className="text-sm text-gray-500">{strategy.description}</p>
                      </div>
                      <Switch
                        checked={spotStrategies[strategy.key] || false}
                        onCheckedChange={(checked) => handleStrategyToggle('spot', strategy.key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leverage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                Leverage Trading Bot Configuration
                <Badge variant="outline" className="text-orange-600">Long & Short</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="leveragePaperTrading">Paper Trading Mode</Label>
                  <p className="text-sm text-gray-500">Practice with virtual money</p>
                </div>
                <Switch
                  id="leveragePaperTrading"
                  checked={currentSettings.leveragePaperTrading}
                  onCheckedChange={(checked) => handleInputChange('leveragePaperTrading', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <div>
                    <Label htmlFor="leverageAiTradingEnabled">AI Trading (DeepSeek)</Label>
                    <p className="text-sm text-gray-500">Enable AI-powered market analysis</p>
                  </div>
                </div>
                <Switch
                  id="leverageAiTradingEnabled"
                  checked={currentSettings.leverageAiTradingEnabled}
                  onCheckedChange={(checked) => handleInputChange('leverageAiTradingEnabled', checked)}
                />
              </div>

              <Separator />

              <div>
                <Label>Leverage Trading Strategies</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                    { key: 'trendFollowing', label: 'Trend Following', description: 'Follow strong trends' },
                    { key: 'meanReversion', label: 'Mean Reversion', description: 'Counter-trend positions' },
                    { key: 'breakoutTrading', label: 'Breakout Trading', description: 'High volatility entries' },
                    { key: 'pullbackTrading', label: 'Pullback Trading', description: 'Strategic retracements' },
                  ].map((strategy) => (
                    <div key={strategy.key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{strategy.label}</p>
                        <p className="text-sm text-gray-500">{strategy.description}</p>
                      </div>
                      <Switch
                        checked={leverageStrategies[strategy.key] || false}
                        onCheckedChange={(checked) => handleStrategyToggle('leverage', strategy.key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Credentials & Risk Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="apiKey">Bybit API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={currentSettings.apiKey || ''}
                    onChange={(e) => handleInputChange('apiKey', e.target.value)}
                    placeholder="Enter your Bybit API key"
                  />
                </div>
                <div>
                  <Label htmlFor="secretKey">Bybit Secret Key</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    value={currentSettings.secretKey || ''}
                    onChange={(e) => handleInputChange('secretKey', e.target.value)}
                    placeholder="Enter your Bybit secret key"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="stopLoss">Stop Loss (%)</Label>
                  <Input
                    id="stopLoss"
                    type="number"
                    step="0.1"
                    value={currentSettings.stopLoss}
                    onChange={(e) => handleInputChange('stopLoss', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="takeProfit">Take Profit (%)</Label>
                  <Input
                    id="takeProfit"
                    type="number"
                    step="0.1"
                    value={currentSettings.takeProfit}
                    onChange={(e) => handleInputChange('takeProfit', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="riskPerTrade">Risk per Trade (%)</Label>
                  <Input
                    id="riskPerTrade"
                    type="number"
                    step="0.1"
                    value={currentSettings.riskPerTrade}
                    onChange={(e) => handleInputChange('riskPerTrade', e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <Label>Technical Indicators</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="rsiPeriod">RSI Period</Label>
                    <Input
                      id="rsiPeriod"
                      type="number"
                      value={currentSettings.rsiPeriod}
                      onChange={(e) => handleInputChange('rsiPeriod', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="adxPeriod">ADX Period</Label>
                    <Input
                      id="adxPeriod"
                      type="number"
                      value={currentSettings.adxPeriod}
                      onChange={(e) => handleInputChange('adxPeriod', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emaFast">EMA Fast</Label>
                    <Input
                      id="emaFast"
                      type="number"
                      value={currentSettings.emaFast}
                      onChange={(e) => handleInputChange('emaFast', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emaSlow">EMA Slow</Label>
                    <Input
                      id="emaSlow"
                      type="number"
                      value={currentSettings.emaSlow}
                      onChange={(e) => handleInputChange('emaSlow', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}