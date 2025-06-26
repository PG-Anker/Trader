import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, TrendingUp, BarChart3, Zap } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedMode, setSelectedMode] = useState<'spot' | 'leverage' | null>(null);

  const handleModeSelect = (mode: 'spot' | 'leverage') => {
    setSelectedMode(mode);
    // Store the selected mode in localStorage or context
    localStorage.setItem('tradingMode', mode);
    // Navigate to dashboard
    setLocation('/dashboard');
  };

  return (
    <div className="min-h-screen bg-crypto-dark-900 text-white">
      {/* Header */}
      <div className="container mx-auto px-6 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mr-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">CryptoBot Pro</h1>
              <p className="text-gray-400 text-lg">Automated Trading Platform</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center space-x-4 mb-8">
            <Badge variant="outline" className="bg-crypto-success bg-opacity-20 text-crypto-success border-crypto-success">
              <div className="w-2 h-2 bg-crypto-success rounded-full mr-2 animate-pulse"></div>
              System Active
            </Badge>
            <Badge variant="outline" className="text-gray-300">
              Bybit Exchange Connected
            </Badge>
          </div>

          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Choose your trading mode to start automated cryptocurrency trading with advanced technical analysis and risk management.
          </p>
        </div>

        {/* Trading Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Spot Trading Card */}
          <Card 
            className={`trading-card cursor-pointer transition-all duration-300 hover:scale-105 hover:border-primary ${
              selectedMode === 'spot' ? 'border-primary bg-primary bg-opacity-10' : ''
            }`}
            onClick={() => setSelectedMode('spot')}
          >
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-crypto-success bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-crypto-success" />
              </div>
              <CardTitle className="text-2xl text-white">Spot Trading</CardTitle>
              <CardDescription className="text-gray-400">
                Buy low, sell high with USDT pairs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-crypto-success rounded-full"></div>
                  <span className="text-gray-300">Automatic buy/sell orders</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-crypto-success rounded-full"></div>
                  <span className="text-gray-300">Technical analysis signals</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-crypto-success rounded-full"></div>
                  <span className="text-gray-300">Stop loss & take profit</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-crypto-success rounded-full"></div>
                  <span className="text-gray-300">Multi-strategy approach</span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-crypto-dark-600">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Direction</p>
                    <p className="text-crypto-success font-semibold">UP Only</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Risk Level</p>
                    <p className="text-crypto-warning font-semibold">Medium</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leverage Trading Card */}
          <Card 
            className={`trading-card cursor-pointer transition-all duration-300 hover:scale-105 hover:border-primary ${
              selectedMode === 'leverage' ? 'border-primary bg-primary bg-opacity-10' : ''
            }`}
            onClick={() => setSelectedMode('leverage')}
          >
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-crypto-warning bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-crypto-warning" />
              </div>
              <CardTitle className="text-2xl text-white">Leverage Trading</CardTitle>
              <CardDescription className="text-gray-400">
                Long and short positions with margin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-crypto-warning rounded-full"></div>
                  <span className="text-gray-300">Long & short positions</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-crypto-warning rounded-full"></div>
                  <span className="text-gray-300">Leverage up to 100x</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-crypto-warning rounded-full"></div>
                  <span className="text-gray-300">Advanced risk management</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-crypto-warning rounded-full"></div>
                  <span className="text-gray-300">Real-time position monitoring</span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-crypto-dark-600">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Direction</p>
                    <p className="text-crypto-warning font-semibold">LONG & SHORT</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Risk Level</p>
                    <p className="text-crypto-danger font-semibold">High</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Overview */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-8">Advanced Trading Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="trading-card p-6">
              <Zap className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Multiple Strategies</h3>
              <p className="text-gray-400 text-sm">
                Trend following, mean reversion, breakout, and pullback trading strategies
              </p>
            </div>
            <div className="trading-card p-6">
              <BarChart3 className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Technical Analysis</h3>
              <p className="text-gray-400 text-sm">
                RSI, MACD, EMA, Bollinger Bands, and ADX indicators for precise entries
              </p>
            </div>
            <div className="trading-card p-6">
              <Bot className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Real-time Monitoring</h3>
              <p className="text-gray-400 text-sm">
                Live position tracking, PnL updates, and automated risk management
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {selectedMode && (
          <div className="mt-12 text-center">
            <Button 
              size="lg" 
              className="px-8 py-4 text-lg bg-primary hover:bg-blue-600 transition-colors"
              onClick={() => handleModeSelect(selectedMode)}
            >
              Start {selectedMode === 'spot' ? 'Spot' : 'Leverage'} Trading
              <TrendingUp className="ml-2 w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
