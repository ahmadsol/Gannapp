import React, { useEffect, useRef, useState } from 'react';

const TradingViewChart = ({ 
  symbol = 'BITSTAMP:BTCUSD', 
  theme = 'light', 
  height = 400,
  onPriceUpdate = null,
  showGannLevels = true,
  entryPrice = null,
  targetPrice = null,
  stopLossPrice = null
}) => {
  const container = useRef();
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(null);
  const widgetRef = useRef(null);

  useEffect(() => {
    // Load TradingView library
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: theme,
      style: "1",
      locale: "en",
      enable_publishing: false,
      withdateranges: true,
      range: "YTD",
      hide_side_toolbar: false,
      allow_symbol_change: true,
      details: true,
      hotlist: true,
      calendar: true,
      studies: [
        "Volume@tv-basicstudies",
        // Add Gann studies
        "GannSquare@tv-basicstudies",
        "GannFan@tv-basicstudies"
      ],
      support_host: "https://www.tradingview.com"
    });

    if (container.current) {
      container.current.appendChild(script);
      
      // Set up price monitoring
      const setupPriceMonitoring = () => {
        try {
          // Listen for price updates from TradingView
          window.addEventListener('message', (event) => {
            if (event.data && event.data.name === 'tv-widget-ready') {
              setIsLoaded(true);
            }
            
            // Listen for price updates
            if (event.data && event.data.type === 'price_update') {
              const price = parseFloat(event.data.price);
              setCurrentPrice(price);
              if (onPriceUpdate) {
                onPriceUpdate(price);
              }
            }
          });
        } catch (error) {
          console.warn('TradingView price monitoring setup failed:', error);
        }
      };

      setTimeout(setupPriceMonitoring, 1000);
    }

    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [symbol, theme, onPriceUpdate]);

  // Bitstamp WebSocket for real-time price updates (backup/enhancement)
  useEffect(() => {
    let ws = null;
    
    const connectWebSocket = () => {
      try {
        // Extract pair from symbol (BITSTAMP:BTCUSD -> btcusd)
        const pair = symbol.split(':')[1]?.toLowerCase() || 'btcusd';
        
        ws = new WebSocket('wss://ws.bitstamp.net');
        
        ws.onopen = () => {
          console.log('Connected to Bitstamp WebSocket');
          // Subscribe to live trades
          ws.send(JSON.stringify({
            event: 'bts:subscribe',
            data: {
              channel: `live_trades_${pair}`
            }
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'trade' && data.data) {
              const price = parseFloat(data.data.price);
              setCurrentPrice(price);
              if (onPriceUpdate) {
                onPriceUpdate(price);
              }
            }
          } catch (error) {
            console.warn('Error parsing WebSocket data:', error);
          }
        };

        ws.onerror = (error) => {
          console.warn('Bitstamp WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('Bitstamp WebSocket disconnected');
          // Reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };
      } catch (error) {
        console.warn('Failed to connect to Bitstamp WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [symbol, onPriceUpdate]);

  return (
    <div className="tradingview-chart-container" style={{ position: 'relative' }}>
      {/* Price Display Overlay */}
      {currentPrice && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 1000
        }}>
          Live: ${currentPrice.toFixed(2)}
        </div>
      )}

      {/* Loading indicator */}
      {!isLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255,255,255,0.9)',
          padding: '20px',
          borderRadius: '8px',
          zIndex: 1000
        }}>
          Loading TradingView Chart...
        </div>
      )}

      {/* Gann Levels Overlay */}
      {showGannLevels && (entryPrice || targetPrice || stopLossPrice) && (
        <div style={{
          position: 'absolute',
          top: '50px',
          right: '10px',
          background: 'rgba(255,255,255,0.95)',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000,
          border: '1px solid #ddd'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Gann Levels</div>
          {entryPrice && <div style={{ color: '#28a745' }}>🟢 Entry: ${entryPrice.toFixed(2)}</div>}
          {targetPrice && <div style={{ color: '#17a2b8' }}>🔵 Target: ${targetPrice.toFixed(2)}</div>}
          {stopLossPrice && <div style={{ color: '#ffc107' }}>🟡 Stop: ${stopLossPrice.toFixed(2)}</div>}
        </div>
      )}

      {/* TradingView Widget Container */}
      <div
        className="tradingview-widget-container"
        ref={container}
        style={{ height: `${height}px`, width: '100%' }}
      >
        <div className="tradingview-widget-container__widget"></div>
      </div>
    </div>
  );
};

export default TradingViewChart;