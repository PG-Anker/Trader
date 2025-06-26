import { EventEmitter } from 'events';

export interface BybitOrderResult {
  orderId: string;
  status: string;
  symbol: string;
  price: string;
  quantity: string;
  side: string;
}

export interface BybitBalance {
  coin: string;
  walletBalance: string;
  availableBalance: string;
}

export interface BybitPosition {
  symbol: string;
  side: string;
  size: string;
  entryPrice: string;
  markPrice: string;
  unrealisedPnl: string;
}

export interface BybitTicker {
  symbol: string;
  lastPrice: string;
  volume24h: string;
  priceChangePercent: string;
}

export class BybitService extends EventEmitter {
  private apiKey: string = '';
  private secretKey: string = '';
  private isTestnet: boolean = true;
  private baseUrl: string = '';
  private wsUrl: string = '';
  private ws: WebSocket | null = null;

  constructor() {
    super();
    this.updateUrls();
  }

  private updateUrls() {
    if (this.isTestnet) {
      this.baseUrl = 'https://api-testnet.bybit.com';
      this.wsUrl = 'wss://stream-testnet.bybit.com/v5/public/spot';
    } else {
      this.baseUrl = 'https://api.bybit.com';
      this.wsUrl = 'wss://stream.bybit.com/v5/public/spot';
    }
  }

  setCredentials(apiKey: string, secretKey: string, isMainnet: boolean = false) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.isTestnet = !isMainnet;
    this.updateUrls();
  }

  async testConnection(apiKey: string, secretKey: string, isMainnet: boolean = false): Promise<{ success: boolean; message: string }> {
    try {
      this.setCredentials(apiKey, secretKey, isMainnet);
      
      // Test the connection by fetching account balance
      const response = await this.makeRequest('GET', '/v5/account/wallet-balance', {
        accountType: 'UNIFIED'
      });

      if (response.retCode === 0) {
        return { success: true, message: 'Connection successful' };
      } else {
        return { success: false, message: response.retMsg || 'Connection failed' };
      }
    } catch (error) {
      console.error('Bybit connection test error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  async getBalance(coin: string = 'USDT'): Promise<BybitBalance | null> {
    try {
      const response = await this.makeRequest('GET', '/v5/account/wallet-balance', {
        accountType: 'UNIFIED',
        coin
      });

      if (response.retCode === 0 && response.result?.list?.[0]?.coin) {
        const coinData = response.result.list[0].coin.find((c: any) => c.coin === coin);
        if (coinData) {
          return {
            coin: coinData.coin,
            walletBalance: coinData.walletBalance,
            availableBalance: coinData.availableToWithdraw
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Get balance error:', error);
      return null;
    }
  }

  async placeOrder(
    symbol: string,
    side: 'Buy' | 'Sell',
    orderType: 'Market' | 'Limit',
    qty: string,
    price?: string,
    category: 'spot' | 'linear' = 'spot'
  ): Promise<BybitOrderResult | null> {
    try {
      const params: any = {
        category,
        symbol,
        side,
        orderType,
        qty
      };

      if (orderType === 'Limit' && price) {
        params.price = price;
      }

      const response = await this.makeRequest('POST', '/v5/order/create', params);

      if (response.retCode === 0) {
        return {
          orderId: response.result.orderId,
          status: response.result.orderStatus,
          symbol,
          price: price || 'Market',
          quantity: qty,
          side
        };
      }
      return null;
    } catch (error) {
      console.error('Place order error:', error);
      return null;
    }
  }

  async getPositions(category: 'spot' | 'linear' = 'linear'): Promise<BybitPosition[]> {
    try {
      const response = await this.makeRequest('GET', '/v5/position/list', {
        category
      });

      if (response.retCode === 0 && response.result?.list) {
        return response.result.list.map((pos: any) => ({
          symbol: pos.symbol,
          side: pos.side,
          size: pos.size,
          entryPrice: pos.avgPrice,
          markPrice: pos.markPrice,
          unrealisedPnl: pos.unrealisedPnl
        }));
      }
      return [];
    } catch (error) {
      console.error('Get positions error:', error);
      return [];
    }
  }

  async getTicker(symbol: string): Promise<BybitTicker | null> {
    try {
      const response = await this.makeRequest('GET', '/v5/market/tickers', {
        category: 'spot',
        symbol
      });

      if (response.retCode === 0 && response.result?.list?.[0]) {
        const ticker = response.result.list[0];
        return {
          symbol: ticker.symbol,
          lastPrice: ticker.lastPrice,
          volume24h: ticker.volume24h,
          priceChangePercent: ticker.price24hPcnt
        };
      }
      return null;
    } catch (error) {
      console.error('Get ticker error:', error);
      return null;
    }
  }

  async getKlines(symbol: string, interval: string, limit: number = 200): Promise<any[]> {
    try {
      const response = await this.makeRequest('GET', '/v5/market/kline', {
        category: 'spot',
        symbol,
        interval,
        limit
      });

      if (response.retCode === 0 && response.result?.list) {
        return response.result.list.map((kline: any) => ({
          timestamp: parseInt(kline[0]),
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5])
        }));
      }
      return [];
    } catch (error) {
      console.error('Get klines error:', error);
      return [];
    }
  }

  connectWebSocket(symbols: string[]) {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      console.log('Bybit WebSocket connected');
      
      // Subscribe to ticker data for symbols
      const subscriptions = symbols.map(symbol => `tickers.${symbol}`);
      
      this.ws?.send(JSON.stringify({
        op: 'subscribe',
        args: subscriptions
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.topic && data.topic.startsWith('tickers.')) {
          const symbol = data.topic.replace('tickers.', '');
          this.emit('ticker', {
            symbol,
            price: data.data.lastPrice,
            volume: data.data.volume24h,
            change: data.data.price24hPcnt
          });
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('Bybit WebSocket error:', error);
      this.emit('error', { message: 'WebSocket connection error' });
    };

    this.ws.onclose = () => {
      console.log('Bybit WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (symbols.length > 0) {
          this.connectWebSocket(symbols);
        }
      }, 5000);
    };
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private async makeRequest(method: string, endpoint: string, params: any = {}): Promise<any> {
    const timestamp = Date.now().toString();
    const url = `${this.baseUrl}${endpoint}`;
    
    // For demo purposes, return mock data if no API key is provided
    if (!this.apiKey || !this.secretKey) {
      console.log(`Mock Bybit API call: ${method} ${endpoint}`, params);
      return this.getMockResponse(endpoint, params);
    }

    // In a real implementation, you would:
    // 1. Create the proper signature using HMAC SHA256
    // 2. Set the appropriate headers
    // 3. Make the HTTP request
    // 4. Handle the response

    const headers = {
      'X-BAPI-API-KEY': this.apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': '5000',
      'Content-Type': 'application/json'
    };

    let body = '';
    let queryString = '';

    if (method === 'GET') {
      queryString = new URLSearchParams(params).toString();
    } else {
      body = JSON.stringify(params);
    }

    // Calculate signature (simplified for demo)
    const signature = this.createSignature(timestamp, this.apiKey, '5000', queryString + body);
    headers['X-BAPI-SIGN'] = signature;

    try {
      const response = await fetch(queryString ? `${url}?${queryString}` : url, {
        method,
        headers,
        body: method !== 'GET' ? body : undefined
      });

      return await response.json();
    } catch (error) {
      console.error('Bybit API request error:', error);
      throw error;
    }
  }

  private createSignature(timestamp: string, apiKey: string, recvWindow: string, params: string): string {
    // In a real implementation, this would create an HMAC SHA256 signature
    // For demo purposes, return a mock signature
    return 'mock_signature_' + timestamp;
  }

  private getMockResponse(endpoint: string, params: any): any {
    // Return appropriate mock responses for testing
    if (endpoint.includes('/wallet-balance')) {
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            coin: [{
              coin: 'USDT',
              walletBalance: '2350.00',
              availableToWithdraw: '2350.00'
            }]
          }]
        }
      };
    }

    if (endpoint.includes('/order/create')) {
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          orderId: 'mock_order_' + Date.now(),
          orderStatus: 'Filled'
        }
      };
    }

    if (endpoint.includes('/position/list')) {
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: []
        }
      };
    }

    if (endpoint.includes('/market/tickers')) {
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            symbol: params.symbol,
            lastPrice: '43287.50',
            volume24h: '1234567.89',
            price24hPcnt: '0.0245'
          }]
        }
      };
    }

    return { retCode: -1, retMsg: 'Unknown endpoint' };
  }
}
