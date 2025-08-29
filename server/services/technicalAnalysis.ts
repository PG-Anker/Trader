import { RSI, EMA, MACD, ADX, SMA, BollingerBands } from 'technicalindicators';

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

  // Comprehensive analysis
  static analyzeSymbol(
    klineData: any[],
    settings: any
  ): { indicators: TechnicalIndicators; signals: TradingSignal[] } {
    if (!klineData || klineData.length < 50) {
      throw new Error('Insufficient data for analysis');
    }

    // Convert OHLCV objects to number arrays (ensure numbers, not strings)
    const closes = klineData.map(k => Number(k.close));
    const highs = klineData.map(k => Number(k.high));
    const lows = klineData.map(k => Number(k.low));

    // Verify we have valid numerical data
    if (closes.some(c => isNaN(c)) || highs.some(h => isNaN(h)) || lows.some(l => isNaN(l))) {
      throw new Error('Invalid market data: contains non-numerical values');
    }

    // Use proven technicalindicators library (same as your working external test)
    const rsiValues = RSI.calculate({ values: closes, period: settings.rsiPeriod });
    const rsi = rsiValues[rsiValues.length - 1] || 50;

    const emaFastValues = EMA.calculate({ values: closes, period: settings.emaFast });
    const emaFast = emaFastValues[emaFastValues.length - 1] || closes[closes.length - 1];

    const emaSlowValues = EMA.calculate({ values: closes, period: settings.emaSlow });
    const emaSlow = emaSlowValues[emaSlowValues.length - 1] || closes[closes.length - 1];

    const macdValues = MACD.calculate({
      values: closes,
      fastPeriod: settings.emaFast,
      slowPeriod: settings.emaSlow,
      signalPeriod: settings.macdSignal,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });
    const macdLatest = macdValues[macdValues.length - 1];
    const macd = {
      macd: macdLatest?.MACD || 0,
      signal: macdLatest?.signal || 0,
      histogram: macdLatest?.histogram || 0
    };

    const smaValues = SMA.calculate({ values: closes, period: 20 });
    const sma20 = smaValues[smaValues.length - 1] || closes[closes.length - 1];

    const bbValues = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
    const bbLatest = bbValues[bbValues.length - 1];
    const bb = {
      upper: bbLatest?.upper || closes[closes.length - 1],
      middle: bbLatest?.middle || closes[closes.length - 1],
      lower: bbLatest?.lower || closes[closes.length - 1]
    };

    const adxValues = ADX.calculate({ close: closes, high: highs, low: lows, period: settings.adxPeriod });
    const adx = adxValues[adxValues.length - 1]?.adx || 25;

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
