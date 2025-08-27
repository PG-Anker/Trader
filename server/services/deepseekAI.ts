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

      // Navigate to DeepSeek Chat
      await this.page.goto(this.chatUrl, { waitUntil: 'networkidle2' });
      
      // Wait for the chat interface to load
      await this.page.waitForSelector('textarea', { timeout: 30000 });
      
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
      throw new Error('DeepSeek AI service not initialized');
    }

    try {
      const prompt = this.constructTradingPrompt(marketData, technicalData, tradingMode);
      
      // Find and click the textarea
      const textarea = await this.page.$('textarea');
      if (!textarea) {
        throw new Error('Chat input not found');
      }

      // Clear any existing text and type the prompt
      await textarea.click({ clickCount: 3 });
      await this.page.keyboard.press('Backspace');
      await textarea.type(prompt, { delay: 50 });
      
      // Send the message (usually Enter key or a send button)
      await this.page.keyboard.press('Enter');
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds for AI response
      
      // Get the latest response
      const response = await this.getLatestResponse();
      
      // Parse the AI response into trading signal
      const signal = this.parseAIResponse(response, marketData.currentPrice);
      
      this.emit('analysis_complete', { symbol: marketData.symbol, signal });
      
      return signal;
      
    } catch (error) {
      console.error('Error analyzing market data with DeepSeek:', error);
      
      // Return a conservative HOLD signal on error
      return {
        action: 'HOLD',
        confidence: 0,
        reasoning: `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        riskLevel: 'HIGH'
      };
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