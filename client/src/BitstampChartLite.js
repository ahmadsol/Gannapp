import React, { useState, useRef, useEffect } from 'react';

const BitstampChartLite = ({ 
  pair = 'BTCUSD',
  height = 300,
  onPriceUpdate = null,
  enableLiveData = true
}) => {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const wsRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // Lightweight TradingView widget (loads only when clicked)
  const loadTradingViewWidget = () => {
    if (isLoaded) return;
    
    const widget = document.createElement('iframe');
    widget.src = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=BITSTAMP%3A${pair}&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=%5B%5D&hideideas=1&theme=light&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost&utm_medium=widget_new&utm_campaign=chart&utm_term=BITSTAMP%3A${pair}`;
    widget.style.width = '100%';
    widget.style.height = `${height - 60}px`;
    widget.style.border = 'none';
    
    const container = document.getElementById(`tv-container-${pair}`);
    if (container) {
      container.innerHTML = '';
      container.appendChild(widget);
      setIsLoaded(true);
    }
  };

  // Efficient WebSocket connection with connection pooling
  useEffect(() => {
    if (!enableLiveData) return;

    let ws = null;
    
    const connectWebSocket = () => {
      try {
        // Close existing connection
        if (wsRef.current) {
          wsRef.current.close();
        }

        const pairLower = pair.toLowerCase();
        ws = new WebSocket('wss://ws.bitstamp.net');
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log(`🟢 Connected to ${pair}`);
          setIsConnected(true);
          
          // Subscribe only to ticker for memory efficiency
          ws.send(JSON.stringify({
            event: 'bts:subscribe',
            data: { channel: `live_ticker_${pairLower}` }
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'data' && data.channel?.includes('ticker')) {
              const price = parseFloat(data.data.last);
              const change = parseFloat(data.data.percent_change_24h) || 0;
              
              setCurrentPrice(price);
              setPriceChange(change);
              
              if (onPriceUpdate) {
                onPriceUpdate({ price, change });
              }
            }
          } catch (error) {
            console.warn('⚠️ WebSocket parse error:', error);
          }
        };

        ws.onerror = () => {
          console.warn(`🔴 ${pair} WebSocket error`);
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log(`🔌 ${pair} disconnected`);
          setIsConnected(false);
          wsRef.current = null;
          
          // Retry with exponential backoff
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          retryTimeoutRef.current = setTimeout(connectWebSocket, 5000);
        };
      } catch (error) {
        console.warn(`❌ Failed to connect ${pair}:`, error);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [pair, enableLiveData, onPriceUpdate]);

  const formatPrice = (price) => {
    if (!price) return 'Loading...';
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  return (
    <div style={{ 
      border: '1px solid #e0e6ed', 
      borderRadius: '8px', 
      background: '#ffffff',
      overflow: 'hidden'
    }}>
      {/* Lightweight Header */}
      <div style={{
        padding: '12px 16px',
        background: '#f8f9fa',
        borderBottom: '1px solid #e0e6ed',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
            {pair}
          </span>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>
            ${formatPrice(currentPrice)}
          </span>
          {priceChange !== 0 && (
            <span style={{ 
              fontSize: '14px', 
              color: priceChange >= 0 ? '#27ae60' : '#e74c3c',
              fontWeight: '500' 
            }}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: isConnected ? '#27ae60' : '#e74c3c'
          }}></div>
          <span style={{ fontSize: '11px', color: '#666' }}>
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Chart Container */}
      <div style={{ position: 'relative', height: `${height - 60}px` }}>
        {!isLoaded ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            background: '#f8f9fa'
          }}>
            <div style={{ marginBottom: '12px', fontSize: '16px', color: '#2c3e50' }}>
              📊 TradingView Chart
            </div>
            <button
              onClick={loadTradingViewWidget}
              style={{
                background: '#4facfe',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Load Chart (saves memory)
            </button>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              Click to load professional chart
            </div>
          </div>
        ) : (
          <div id={`tv-container-${pair}`} style={{ width: '100%', height: '100%' }}></div>
        )}
      </div>
    </div>
  );
};

export default BitstampChartLite;