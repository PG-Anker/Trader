export interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  ema12: number;
  ema26: number;
  emaFast: number;
  emaSlow: number;
  sma20: number;
  bb: {
    upper: number;
    middle: number;
    lower: number;
  };
  adx: number;
  currentPrice: number;
}

export interface TradingSignal {
  symbol: string;
  direction: 'UP' | 'LONG' | 'SHORT';
  confidence: number;
  strategy: string;
  indicators: TechnicalIndicators;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
}

export class TechnicalAnalysis {
  // RSI calculation
  static calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50; // Default neutral value

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff > 0) {
        gains += diff;
      } else {
        losses -= diff;
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // EMA calculation
  static calculateEMA(prices: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const emaArray: number[] = [prices[0]];

    for (let i = 1; i < prices.length; i++) {
      emaArray.push(prices[i] * k + emaArray[i - 1] * (1 - k));
    }

    return emaArray;
  }

  // SMA calculation
  static calculateSMA(prices: number[], period: number): number[] {
    const smaArray: number[] = [];

    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      smaArray.push(sum / period);
    }

    return smaArray;
  }

  // MACD calculation
  static calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
    const emaFast = this.calculateEMA(prices, fastPeriod);
    const emaSlow = this.calculateEMA(prices, slowPeriod);

    const macdLine = emaFast.map((fast, i) => fast - (emaSlow[i] || 0));
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    const histogram = macdLine.map((macd, i) => macd - (signalLine[i] || 0));

    return {
      macd: macdLine[macdLine.length - 1] || 0,
      signal: signalLine[signalLine.length - 1] || 0,
      histogram: histogram[histogram.length - 1] || 0
    };
  }

  // Bollinger Bands calculation
  static calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
    const sma = this.calculateSMA(prices, period);
    const currentSMA = sma[sma.length - 1];

    // Calculate standard deviation
    const recentPrices = prices.slice(-period);
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - currentSMA, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: currentSMA + (standardDeviation * stdDev),
      middle: currentSMA,
      lower: currentSMA - (standardDeviation * stdDev)
    };
  }

  // ADX calculation (simplified)
  static calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (highs.length < period + 1) return 25; // Default neutral value

    const trueRanges: number[] = [];
    const positiveDMs: number[] = [];
    const negativeDMs: number[] = [];

    for (let i = 1; i < highs.length; i++) {
      const highDiff = highs[i] - highs[i - 1];
      const lowDiff = lows[i - 1] - lows[i];

      const trueRange = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );

      trueRanges.push(trueRange);
      positiveDMs.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
      negativeDMs.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
    }

    // Calculate smoothed averages (simplified)
    const avgTR = trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgPosDM = positiveDMs.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgNegDM = negativeDMs.slice(-period).reduce((a, b) => a + b, 0) / period;

    const positiveDI = (avgPosDM / avgTR) * 100;
    const negativeDI = (avgNegDM / avgTR) * 100;

    const dx = Math.abs(positiveDI - negativeDI) / (positiveDI + negativeDI) * 100;
    return dx || 25;
  }

  // Comprehensive analysis
  static analyzeSymbol(
    klineData: any[],
    settings: any
  ): { indicators: TechnicalIndicators; signals: TradingSignal[] } {
    if (!klineData || klineData.length < 50) {
      throw new Error('Insufficient data for analysis');
    }

    const closes = klineData.map(k => k.close);
    const highs = klineData.map(k => k.high);
    const lows = klineData.map(k => k.low);

    const rsi = this.calculateRSI(closes, settings.rsiPeriod);
    const macd = this.calculateMACD(closes, settings.emaFast, settings.emaSlow, settings.macdSignal);
    const emaFast = this.calculateEMA(closes, settings.emaFast).slice(-1)[0];
    const emaSlow = this.calculateEMA(closes, settings.emaSlow).slice(-1)[0];
    const sma20 = this.calculateSMA(closes, 20).slice(-1)[0];
    const bb = this.calculateBollingerBands(closes);
    const adx = this.calculateADX(highs, lows, closes, settings.adxPeriod);
    const currentPrice = closes[closes.length - 1];

    const indicators: TechnicalIndicators = {
      rsi,
      macd,
      ema12: emaFast,
      ema26: emaSlow,
      emaFast,
      emaSlow,
      sma20,
      bb,
      adx,
      currentPrice
    };

    const signals = this.generateSignals(indicators, closes[closes.length - 1], settings);

    return { indicators, signals };
  }

  // Generate trading signals based on strategies
  static generateSignals(
    indicators: TechnicalIndicators,
    currentPrice: number,
    settings: any
  ): TradingSignal[] {
    const signals: TradingSignal[] = [];
    const strategies = settings.strategies || {};

    // Trend Following Strategy
    if (strategies.trendFollowing) {
      const trendSignal = this.trendFollowingStrategy(indicators, currentPrice, settings);
      if (trendSignal) signals.push(trendSignal);
    }

    // Mean Reversion Strategy
    if (strategies.meanReversion) {
      const meanReversionSignal = this.meanReversionStrategy(indicators, currentPrice, settings);
      if (meanReversionSignal) signals.push(meanReversionSignal);
    }

    // Breakout Strategy
    if (strategies.breakoutTrading) {
      const breakoutSignal = this.breakoutStrategy(indicators, currentPrice, settings);
      if (breakoutSignal) signals.push(breakoutSignal);
    }

    // Pullback Strategy
    if (strategies.pullbackTrading) {
      const pullbackSignal = this.pullbackStrategy(indicators, currentPrice, settings);
      if (pullbackSignal) signals.push(pullbackSignal);
    }

    return signals.filter(signal => signal.confidence >= settings.minConfidence);
  }

  private static trendFollowingStrategy(
    indicators: TechnicalIndicators,
    currentPrice: number,
    settings: any
  ): TradingSignal | null {
    const { rsi, macd, ema12, ema26, adx } = indicators;

    // Strong trend conditions
    const strongTrend = adx > 25;
    const bullishTrend = ema12 > ema26 && macd.macd > macd.signal;
    const bearishTrend = ema12 < ema26 && macd.macd < macd.signal;

    let confidence = 0;
    let direction: 'LONG' | 'SHORT' | null = null;

    if (strongTrend && bullishTrend) {
      direction = 'LONG';
      confidence = 60 + Math.min(adx - 25, 30) + (rsi < 70 ? 10 : 0);
    } else if (strongTrend && bearishTrend) {
      direction = 'SHORT';
      confidence = 60 + Math.min(adx - 25, 30) + (rsi > 30 ? 10 : 0);
    }

    if (!direction || confidence < settings.minConfidence) return null;

    const stopLossPercent = parseFloat(settings.stopLoss) / 100;
    const takeProfitPercent = parseFloat(settings.takeProfit) / 100;

    return {
      symbol: '', // Will be set by caller
      direction,
      confidence,
      strategy: 'Trend Following',
      indicators,
      entryPrice: currentPrice,
      stopLoss: direction === 'LONG' 
        ? currentPrice * (1 - stopLossPercent)
        : currentPrice * (1 + stopLossPercent),
      takeProfit: direction === 'LONG'
        ? currentPrice * (1 + takeProfitPercent)
        : currentPrice * (1 - takeProfitPercent)
    };
  }

  private static meanReversionStrategy(
    indicators: TechnicalIndicators,
    currentPrice: number,
    settings: any
  ): TradingSignal | null {
    const { rsi, bb } = indicators;

    let confidence = 0;
    let direction: 'LONG' | 'SHORT' | null = null;

    // Oversold conditions
    if (rsi < settings.rsiLow && currentPrice < bb.lower) {
      direction = 'LONG';
      confidence = 70 + Math.max(settings.rsiLow - rsi, 0) * 2;
    }
    // Overbought conditions
    else if (rsi > settings.rsiHigh && currentPrice > bb.upper) {
      direction = 'SHORT';
      confidence = 70 + Math.max(rsi - settings.rsiHigh, 0) * 2;
    }

    if (!direction || confidence < settings.minConfidence) return null;

    const stopLossPercent = parseFloat(settings.stopLoss) / 100;
    const takeProfitPercent = parseFloat(settings.takeProfit) / 100;

    return {
      symbol: '',
      direction,
      confidence: Math.min(confidence, 95),
      strategy: 'Mean Reversion',
      indicators,
      entryPrice: currentPrice,
      stopLoss: direction === 'LONG' 
        ? currentPrice * (1 - stopLossPercent)
        : currentPrice * (1 + stopLossPercent),
      takeProfit: direction === 'LONG'
        ? bb.middle
        : bb.middle
    };
  }

  private static breakoutStrategy(
    indicators: TechnicalIndicators,
    currentPrice: number,
    settings: any
  ): TradingSignal | null {
    const { bb, adx } = indicators;

    let confidence = 0;
    let direction: 'LONG' | 'SHORT' | null = null;

    // Breakout above upper band with strong momentum
    if (currentPrice > bb.upper && adx > 20) {
      direction = 'LONG';
      confidence = 75 + Math.min(adx - 20, 20);
    }
    // Breakdown below lower band with strong momentum
    else if (currentPrice < bb.lower && adx > 20) {
      direction = 'SHORT';
      confidence = 75 + Math.min(adx - 20, 20);
    }

    if (!direction || confidence < settings.minConfidence) return null;

    const stopLossPercent = parseFloat(settings.stopLoss) / 100;
    const takeProfitPercent = parseFloat(settings.takeProfit) / 100;

    return {
      symbol: '',
      direction,
      confidence: Math.min(confidence, 95),
      strategy: 'Breakout',
      indicators,
      entryPrice: currentPrice,
      stopLoss: direction === 'LONG' 
        ? bb.middle
        : bb.middle,
      takeProfit: direction === 'LONG'
        ? currentPrice * (1 + takeProfitPercent)
        : currentPrice * (1 - takeProfitPercent)
    };
  }

  private static pullbackStrategy(
    indicators: TechnicalIndicators,
    currentPrice: number,
    settings: any
  ): TradingSignal | null {
    const { rsi, ema12, ema26, macd } = indicators;

    let confidence = 0;
    let direction: 'LONG' | 'SHORT' | null = null;

    // Bullish pullback in uptrend
    if (ema12 > ema26 && rsi > 40 && rsi < 60 && macd.histogram > 0) {
      direction = 'LONG';
      confidence = 65 + (60 - Math.abs(rsi - 50)) * 0.5;
    }
    // Bearish pullback in downtrend
    else if (ema12 < ema26 && rsi < 60 && rsi > 40 && macd.histogram < 0) {
      direction = 'SHORT';
      confidence = 65 + (60 - Math.abs(rsi - 50)) * 0.5;
    }

    if (!direction || confidence < settings.minConfidence) return null;

    const stopLossPercent = parseFloat(settings.stopLoss) / 100;
    const takeProfitPercent = parseFloat(settings.takeProfit) / 100;

    return {
      symbol: '',
      direction,
      confidence: Math.min(confidence, 90),
      strategy: 'Pullback',
      indicators,
      entryPrice: currentPrice,
      stopLoss: direction === 'LONG' 
        ? currentPrice * (1 - stopLossPercent)
        : currentPrice * (1 + stopLossPercent),
      takeProfit: direction === 'LONG'
        ? currentPrice * (1 + takeProfitPercent)
        : currentPrice * (1 - takeProfitPercent)
    };
  }
}
