// Centralized WebSocket Manager for Bitstamp
// Solves multiple connection issues by using a single shared connection

class BitstampWebSocketManager {
  constructor() {
    this.ws = null;
    this.subscribers = new Map(); // pair -> Set of callbacks
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.isConnecting = false;
    this.subscribedPairs = new Set();
    this.pingInterval = null;
  }

  // Get singleton instance
  static getInstance() {
    if (!BitstampWebSocketManager.instance) {
      BitstampWebSocketManager.instance = new BitstampWebSocketManager();
    }
    return BitstampWebSocketManager.instance;
  }

  // Subscribe to price updates for a specific pair
  subscribe(pair, callback) {
    if (!this.subscribers.has(pair)) {
      this.subscribers.set(pair, new Set());
    }
    this.subscribers.get(pair).add(callback);

    // Connect if not already connected
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    } else if (!this.subscribedPairs.has(pair)) {
      // Subscribe to the pair if connection is already open
      this.subscribeToPair(pair);
    }

    console.log(`📡 Subscribed to ${pair}, total subscribers: ${this.subscribers.get(pair).size}`);
  }

  // Unsubscribe from price updates
  unsubscribe(pair, callback) {
    if (this.subscribers.has(pair)) {
      this.subscribers.get(pair).delete(callback);
      
      // If no more subscribers for this pair, we could unsubscribe from Bitstamp
      if (this.subscribers.get(pair).size === 0) {
        this.subscribers.delete(pair);
        this.subscribedPairs.delete(pair);
        console.log(`📡 No more subscribers for ${pair}, unsubscribed`);
      }
    }

    // Close connection if no subscribers at all
    if (this.subscribers.size === 0 && this.ws) {
      this.disconnect();
    }
  }

  // Establish WebSocket connection
  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    console.log('📡 Connecting to Bitstamp WebSocket...');

    try {
      this.ws = new WebSocket('wss://ws.bitstamp.net');

      this.ws.onopen = () => {
        console.log('✅ Connected to Bitstamp WebSocket');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Subscribe to all pairs that have subscribers
        for (const pair of this.subscribers.keys()) {
          this.subscribeToPair(pair);
        }

        // Start ping to keep connection alive
        this.startPing();

        // Notify all subscribers of connection status
        this.notifyConnectionStatus(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.warn('📡 Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.warn('📡 WebSocket error:', error);
        this.isConnecting = false;
        this.notifyConnectionStatus(false);
      };

      this.ws.onclose = () => {
        console.log('📡 WebSocket disconnected');
        this.isConnecting = false;
        this.subscribedPairs.clear();
        this.stopPing();
        this.notifyConnectionStatus(false);
        this.scheduleReconnect();
      };

    } catch (error) {
      console.error('📡 Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  // Subscribe to a specific trading pair
  subscribeToPair(pair) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const pairLower = pair.toLowerCase();

    // Subscribe to ticker (24hr stats)
    this.ws.send(JSON.stringify({
      event: 'bts:subscribe',
      data: {
        channel: `live_ticker_${pairLower}`
      }
    }));

    // Subscribe to live trades
    this.ws.send(JSON.stringify({
      event: 'bts:subscribe',
      data: {
        channel: `live_trades_${pairLower}`
      }
    }));

    this.subscribedPairs.add(pair);
    console.log(`📡 Subscribed to channels for ${pair}`);
  }

  // Handle incoming WebSocket messages
  handleMessage(data) {
    try {
      // Handle ticker data (24hr change)
      if (data.event === 'data' && data.channel?.includes('ticker')) {
        const pair = this.extractPairFromChannel(data.channel);
        const tickerData = data.data;
        
        if (tickerData.last && this.subscribers.has(pair)) {
          const priceData = {
            price: parseFloat(tickerData.last),
            change: parseFloat(tickerData.percent_change_24h) || 0,
            volume: parseFloat(tickerData.volume) || 0,
            high: parseFloat(tickerData.high) || 0,
            low: parseFloat(tickerData.low) || 0,
            timestamp: Date.now(),
            source: 'bitstamp_live'
          };

          // Notify all subscribers for this pair
          for (const callback of this.subscribers.get(pair)) {
            callback(priceData);
          }
        }
      }

      // Handle trade data (real-time price updates)
      if (data.event === 'trade' && data.data) {
        const pair = this.extractPairFromChannel(data.channel);
        
        if (this.subscribers.has(pair)) {
          const priceData = {
            price: parseFloat(data.data.price),
            timestamp: data.data.timestamp * 1000, // Convert to milliseconds
            source: 'bitstamp_live',
            type: 'trade'
          };

          // Notify all subscribers for this pair
          for (const callback of this.subscribers.get(pair)) {
            callback(priceData);
          }
        }
      }

    } catch (error) {
      console.warn('📡 Error handling message:', error);
    }
  }

  // Extract pair from channel name (e.g., "live_ticker_btcusd" -> "BTCUSD")
  extractPairFromChannel(channel) {
    const match = channel.match(/live_(?:ticker|trades)_(.+)/);
    return match ? match[1].toUpperCase() : '';
  }

  // Notify all subscribers of connection status
  notifyConnectionStatus(isConnected) {
    for (const callbacks of this.subscribers.values()) {
      for (const callback of callbacks) {
        if (typeof callback === 'function') {
          callback({ isConnected, type: 'connection_status' });
        }
      }
    }
  }

  // Schedule reconnection with exponential backoff
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('📡 Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`📡 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Start ping to keep connection alive
  startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send a ping message (some servers expect this)
        try {
          this.ws.send(JSON.stringify({ event: 'ping' }));
        } catch (error) {
          console.warn('📡 Failed to send ping:', error);
        }
      }
    }, 30000); // Ping every 30 seconds
  }

  // Stop ping interval
  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Disconnect and cleanup
  disconnect() {
    console.log('📡 Disconnecting WebSocket manager');
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopPing();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscribedPairs.clear();
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  // Get connection status
  getStatus() {
    return {
      connected: this.ws && this.ws.readyState === WebSocket.OPEN,
      connecting: this.isConnecting,
      subscribers: this.subscribers.size,
      subscribedPairs: Array.from(this.subscribedPairs),
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

export default BitstampWebSocketManager;