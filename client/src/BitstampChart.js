import React, { useEffect, useRef, useState } from 'react';
import BitstampWebSocketManager from './BitstampWebSocketManager';

const BitstampChart = ({ 
  pair = 'BTCUSD',
  height = 400,
  onPriceUpdate = null,
  entryPrice = null,
  targetPrice = null,
  stopLossPrice = null
}) => {
  const container = useRef();
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Create TradingView Advanced Chart Widget
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    
    const widgetConfig = {
      autosize: true,
      symbol: `BITSTAMP:${pair}`,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "light",
      style: "1",
      locale: "en",
      enable_publishing: false,
      withdateranges: true,
      range: "6M",
      hide_side_toolbar: false,
      allow_symbol_change: false,
      details: true,
      hotlist: false,
      calendar: false,
      studies: [
        "Volume@tv-basicstudies"
      ],
      show_popup_button: true,
      popup_width: "1000",
      popup_height: "650",
      support_host: "https://www.tradingview.com"
    };

    script.innerHTML = JSON.stringify(widgetConfig);

    if (container.current) {
      container.current.innerHTML = ''; // Clear previous content
      container.current.appendChild(script);
    }

    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [pair]);

  // Bitstamp WebSocket for real-time price using centralized manager
  useEffect(() => {
    const wsManager = BitstampWebSocketManager.getInstance();
    
    // Callback to handle price updates from the centralized manager
    const handlePriceUpdate = (priceData) => {
      // Handle connection status updates
      if (priceData.type === 'connection_status') {
        setIsConnected(priceData.isConnected);
        return;
      }

      // Handle price data updates
      if (priceData.price) {
        setCurrentPrice(priceData.price);
        
        if (priceData.change !== undefined) {
          setPriceChange(priceData.change);
        }

        // Forward to parent component
        if (onPriceUpdate) {
          onPriceUpdate(priceData);
        }
      }
    };

    // Subscribe to price updates for this pair
    wsManager.subscribe(pair, handlePriceUpdate);

    // Cleanup subscription when component unmounts
    return () => {
      wsManager.unsubscribe(pair, handlePriceUpdate);
    };
  }, [pair, onPriceUpdate]);

  const formatPrice = (price) => {
    if (!price) return 'Loading...';
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  return (
    <div className="bitstamp-chart-container" style={{ position: 'relative', height: `${height}px` }}>

      {/* Gann Levels Overlay */}
      {(entryPrice || targetPrice || stopLossPrice) && (
        <div style={{
          position: 'absolute',
          top: '70px',
          right: '10px',
          background: 'rgba(255,255,255,0.95)',
          padding: '10px',
          borderRadius: '6px',
          fontSize: '12px',
          zIndex: 1000,
          border: '1px solid #ddd',
          minWidth: '120px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#2c3e50' }}>
            Gann Levels
          </div>
          {entryPrice && (
            <div style={{ color: '#28a745', marginBottom: '3px' }}>
              🟢 Entry: ${formatPrice(entryPrice)}
            </div>
          )}
          {targetPrice && (
            <div style={{ color: '#17a2b8', marginBottom: '3px' }}>
              🔵 Target: ${formatPrice(targetPrice)}
            </div>
          )}
          {stopLossPrice && (
            <div style={{ color: '#ffc107' }}>
              🟡 Stop: ${formatPrice(stopLossPrice)}
            </div>
          )}
        </div>
      )}

      {/* TradingView Chart Container */}
      <div
        className="tradingview-widget-container"
        ref={container}
        style={{ height: '100%', width: '100%' }}
      >
        <div className="tradingview-widget-container__widget" style={{ height: '100%', width: '100%' }}></div>
      </div>
      
      {/* Powered by attribution */}
      <div style={{
        position: 'absolute',
        bottom: '5px',
        right: '5px',
        fontSize: '10px',
        color: '#888',
        background: 'rgba(255,255,255,0.8)',
        padding: '2px 6px',
        borderRadius: '3px'
      }}>
        Powered by Bitstamp + TradingView
      </div>
    </div>
  );
};

export default BitstampChart;