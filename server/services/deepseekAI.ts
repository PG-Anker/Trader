import puppeteer, { Browser, Page } from 'puppeteer';
import { EventEmitter } from 'events';

export interface MarketDataForAI {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  highPrice24h: number;
  lowPrice24h: number;
  timestamp: Date;
}

export interface TechnicalDataForAI {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  ema: {
    fast: number;
    slow: number;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  adx: number;
  support: number;
  resistance: number;
}

export interface AITradingSignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  reasoning: string;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class DeepSeekAIService extends EventEmitter {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isInitialized: boolean = false;
  private chatUrl = 'https://chat.deepseek.com/';

  constructor() {
    super();
  }

  isReady(): boolean {
    return this.isInitialized && this.browser !== null && this.page !== null;
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing DeepSeek AI service...');
      
      // Configure browser launch options for production Ubuntu server
      const browserOptions = {
        headless: true,
        executablePath: process.env.CHROME_BIN || '/usr/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      };

      this.browser = await puppeteer.launch(browserOptions);

      this.page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      );

      // Navigate to DeepSeek Chat with longer timeout
      console.log('Navigating to DeepSeek Chat...');
      await this.page.goto(this.chatUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      console.log('Page loaded, title:', await this.page.title());
      console.log('Page URL:', this.page.url());
      
      // Take screenshot for debugging
      await this.page.screenshot({ path: 'deepseek_page_loaded.png' });
      
      // Wait longer and try multiple selectors
      console.log('Looking for chat input...');
      try {
        // Try multiple possible selectors for the chat input
        await Promise.race([
          this.page.waitForSelector('textarea', { timeout: 30000 }),
          this.page.waitForSelector('input[type="text"]', { timeout: 30000 }),
          this.page.waitForSelector('[contenteditable="true"]', { timeout: 30000 }),
          this.page.waitForSelector('[data-testid="chat-input"]', { timeout: 30000 }),
          this.page.waitForSelector('#chat-input', { timeout: 30000 })
        ]);
        console.log('Chat input found!');
      } catch (error) {
        console.error('Chat input not found after trying multiple selectors');
        await this.page.screenshot({ path: 'deepseek_no_input.png' });
        
        // Check if we need to handle login or other dialogs
        const pageContent = await this.page.content();
        console.log('Page contains login:', pageContent.includes('login') || pageContent.includes('sign'));
        console.log('Page contains chat:', pageContent.includes('chat') || pageContent.includes('message'));
        
        throw new Error('Chat input element not found - website may have changed or requires login');
      }
      
      this.isInitialized = true;
      console.log('DeepSeek AI service initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize DeepSeek AI service:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async analyzeMarketData(
    marketData: MarketDataForAI, 
    technicalData: TechnicalDataForAI,
    tradingMode: 'spot' | 'leverage'
  ): Promise<AITradingSignal> {
    if (!this.isInitialized || !this.page) {
      // Fallback to intelligent analysis without browser automation
      return this.fallbackAIAnalysis(marketData, technicalData, tradingMode);
    }

    try {
      const prompt = this.constructTradingPrompt(marketData, technicalData, tradingMode);
      
      // Try multiple selectors for chat input
      let chatInput;
      try {
        chatInput = await this.page.$('textarea') || 
                   await this.page.$('input[type="text"]') || 
                   await this.page.$('[contenteditable="true"]');
      } catch (e) {
        console.log('Chat input selection failed, using fallback analysis');
        return this.fallbackAIAnalysis(marketData, technicalData, tradingMode);
      }

      if (!chatInput) {
        return this.fallbackAIAnalysis(marketData, technicalData, tradingMode);
      }

      // Clear any existing text and type the prompt
      await chatInput.click({ clickCount: 3 });
      await this.page.keyboard.press('Backspace');
      await chatInput.type(prompt, { delay: 50 });
      
      // Send the message
      await this.page.keyboard.press('Enter');
      
      // Wait for response with timeout
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Get the latest response
      const response = await this.getLatestResponse();
      
      if (!response || response.length < 20) {
        return this.fallbackAIAnalysis(marketData, technicalData, tradingMode);
      }
      
      // Parse the AI response into trading signal
      const signal = this.parseAIResponse(response, marketData.currentPrice);
      
      this.emit('analysis_complete', { symbol: marketData.symbol, signal });
      
      return signal;
      
    } catch (error) {
      console.error('Error with browser-based AI analysis:', error);
      return this.fallbackAIAnalysis(marketData, technicalData, tradingMode);
    }
  }

  private constructTradingPrompt(
    marketData: MarketDataForAI, 
    technicalData: TechnicalDataForAI,
    tradingMode: 'spot' | 'leverage'
  ): string {
    return `
You are an expert cryptocurrency trading analyst. Analyze the following market data and provide a clear trading recommendation.

**TRADING MODE**: ${tradingMode.toUpperCase()}

**MARKET DATA for ${marketData.symbol}:**
- Current Price: $${marketData.currentPrice}
- 24h Change: ${marketData.priceChange24h}%
- 24h Volume: $${marketData.volume24h.toLocaleString()}
- 24h High: $${marketData.highPrice24h}
- 24h Low: $${marketData.lowPrice24h}

**TECHNICAL INDICATORS:**
- RSI: ${technicalData.rsi}
- MACD: ${technicalData.macd.macd} (Signal: ${technicalData.macd.signal})
- EMA Fast: $${technicalData.ema.fast}
- EMA Slow: $${technicalData.ema.slow}
- Bollinger Bands: Upper $${technicalData.bollinger.upper}, Lower $${technicalData.bollinger.lower}
- ADX: ${technicalData.adx}
- Support: $${technicalData.support}
- Resistance: $${technicalData.resistance}

**RESPONSE FORMAT (MANDATORY):**
Please respond EXACTLY in this format:

ACTION: [BUY/SELL/HOLD]
CONFIDENCE: [0-100]
RISK: [LOW/MEDIUM/HIGH]
ENTRY: [price or N/A]
STOP_LOSS: [price or N/A]
TAKE_PROFIT: [price or N/A]
REASONING: [detailed analysis in 2-3 sentences]

**IMPORTANT RULES:**
1. Only recommend BUY/SELL if confidence is above 70%
2. Always provide risk assessment
3. Consider ${tradingMode} trading characteristics
4. Be conservative with leverage trading recommendations
5. Factor in current market volatility

Analyze now and provide your recommendation:
    `.trim();
  }

  private async getLatestResponse(): Promise<string> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      // Wait for the response to appear
      await this.page.waitForSelector('[data-testid="chat-message"]', { timeout: 15000 });
      
      // Get all chat messages
      const messages = await this.page.$$eval('[data-testid="chat-message"]', elements => 
        elements.map(el => el.textContent?.trim() || '')
      );
      
      // Return the last message (AI response)
      const lastMessage = messages[messages.length - 1];
      
      if (!lastMessage) {
        throw new Error('No response received from DeepSeek');
      }
      
      return lastMessage;
      
    } catch (error) {
      console.error('Error getting response from DeepSeek:', error);
      
      // Try alternative selector if the first one fails
      try {
        const fallbackMessages = await this.page.$$eval('.message', elements => 
          elements.map(el => el.textContent?.trim() || '')
        );
        
        if (fallbackMessages.length > 0) {
          return fallbackMessages[fallbackMessages.length - 1];
        }
      } catch (fallbackError) {
        console.error('Fallback selector also failed:', fallbackError);
      }
      
      throw new Error('Failed to retrieve AI response');
    }
  }

  private parseAIResponse(response: string, currentPrice: number): AITradingSignal {
    try {
      // Extract structured data from the AI response
      const actionMatch = response.match(/ACTION:\s*(BUY|SELL|HOLD)/i);
      const confidenceMatch = response.match(/CONFIDENCE:\s*(\d+)/);
      const riskMatch = response.match(/RISK:\s*(LOW|MEDIUM|HIGH)/i);
      const entryMatch = response.match(/ENTRY:\s*(\d+\.?\d*|N\/A)/i);
      const stopLossMatch = response.match(/STOP_LOSS:\s*(\d+\.?\d*|N\/A)/i);
      const takeProfitMatch = response.match(/TAKE_PROFIT:\s*(\d+\.?\d*|N\/A)/i);
      const reasoningMatch = response.match(/REASONING:\s*(.+)/i);

      const action = (actionMatch?.[1]?.toUpperCase() as 'BUY' | 'SELL' | 'HOLD') || 'HOLD';
      const confidence = parseInt(confidenceMatch?.[1] || '0');
      const riskLevel = (riskMatch?.[1]?.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH') || 'HIGH';
      const reasoning = reasoningMatch?.[1]?.trim() || 'AI analysis completed';

      let entryPrice: number | undefined;
      let stopLoss: number | undefined;
      let takeProfit: number | undefined;

      // Parse prices
      const entryStr = entryMatch?.[1];
      if (entryStr && entryStr !== 'N/A') {
        entryPrice = parseFloat(entryStr);
      }

      const stopLossStr = stopLossMatch?.[1];
      if (stopLossStr && stopLossStr !== 'N/A') {
        stopLoss = parseFloat(stopLossStr);
      }

      const takeProfitStr = takeProfitMatch?.[1];
      if (takeProfitStr && takeProfitStr !== 'N/A') {
        takeProfit = parseFloat(takeProfitStr);
      }

      return {
        action,
        confidence,
        reasoning,
        entryPrice: entryPrice || currentPrice,
        stopLoss,
        takeProfit,
        riskLevel
      };

    } catch (error) {
      console.error('Error parsing AI response:', error);
      
      // Return conservative signal if parsing fails
      return {
        action: 'HOLD',
        confidence: 0,
        reasoning: `Failed to parse AI response: ${response.substring(0, 100)}...`,
        riskLevel: 'HIGH'
      };
    }
  }

  private fallbackAIAnalysis(
    marketData: MarketDataForAI, 
    technicalData: TechnicalDataForAI,
    tradingMode: 'spot' | 'leverage'
  ): AITradingSignal {
    // Intelligent fallback analysis using advanced technical analysis rules
    console.log(`Using fallback AI analysis for ${marketData.symbol}`);
    
    const { rsi, macd, adx, ema, bollinger } = technicalData;
    
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let reasoning = '';
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    
    // Advanced multi-indicator analysis
    if (rsi < 25 && macd.histogram > 0 && adx > 25) {
      action = 'BUY';
      confidence = 85;
      reasoning = `Strong oversold reversal signal: RSI (${rsi.toFixed(1)}) extremely oversold with MACD bullish crossover and strong trend (ADX: ${adx.toFixed(1)}).`;
      riskLevel = 'LOW';
    } else if (rsi > 75 && macd.histogram < 0 && adx > 25) {
      action = 'SELL';
      confidence = 85;
      reasoning = `Strong overbought reversal signal: RSI (${rsi.toFixed(1)}) extremely overbought with MACD bearish crossover and strong trend (ADX: ${adx.toFixed(1)}).`;
      riskLevel = 'LOW';
    } else if (rsi < 35 && marketData.currentPrice < bollinger.lower && ema.fast > ema.slow) {
      action = 'BUY';
      confidence = 78;
      reasoning = `Oversold bounce opportunity: RSI (${rsi.toFixed(1)}) below 35, price below Bollinger lower band, with bullish EMA structure.`;
      riskLevel = 'MEDIUM';
    } else if (rsi > 65 && marketData.currentPrice > bollinger.upper && ema.fast < ema.slow) {
      action = 'SELL';
      confidence = 78;
      reasoning = `Overbought rejection signal: RSI (${rsi.toFixed(1)}) above 65, price above Bollinger upper band, with bearish EMA structure.`;
      riskLevel = 'MEDIUM';
    } else if (macd.macd > macd.signal && rsi > 45 && rsi < 60 && adx > 20) {
      action = 'BUY';
      confidence = 72;
      reasoning = `Moderate bullish momentum: MACD bullish crossover with neutral RSI (${rsi.toFixed(1)}) and developing trend strength.`;
      riskLevel = 'MEDIUM';
    } else if (macd.macd < macd.signal && rsi < 55 && rsi > 40 && adx > 20) {
      action = 'SELL';
      confidence = 72;
      reasoning = `Moderate bearish momentum: MACD bearish crossover with neutral RSI (${rsi.toFixed(1)}) and developing trend strength.`;
      riskLevel = 'MEDIUM';
    } else {
      confidence = 45;
      reasoning = `No clear trading opportunity: RSI (${rsi.toFixed(1)}) in neutral zone, mixed signals from MACD and trend indicators.`;
      riskLevel = 'HIGH';
    }
    
    // Adjust for leverage trading (more conservative)
    if (tradingMode === 'leverage') {
      confidence = Math.max(confidence - 15, 0);
      if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
      if (riskLevel === 'MEDIUM') riskLevel = 'HIGH';
    }
    
    // Calculate entry, stop loss, and take profit
    const entryPrice = marketData.currentPrice;
    let stopLoss: number | undefined;
    let takeProfit: number | undefined;
    
    if (action === 'BUY') {
      stopLoss = entryPrice * 0.97; // 3% stop loss
      takeProfit = entryPrice * 1.06; // 6% take profit
    } else if (action === 'SELL') {
      stopLoss = entryPrice * 1.03; // 3% stop loss
      takeProfit = entryPrice * 0.94; // 6% take profit
    }
    
    return {
      action,
      confidence,
      reasoning,
      entryPrice,
      stopLoss,
      takeProfit,
      riskLevel
    };
  }

  async destroy(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      this.isInitialized = false;
      console.log('DeepSeek AI service destroyed');
      
    } catch (error) {
      console.error('Error destroying DeepSeek AI service:', error);
    }
  }
}