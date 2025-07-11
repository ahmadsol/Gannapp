import React, { useState, useEffect } from 'react';
import './App.css';
import './animations.css';
import PatternVisualization from './PatternVisualization';
import MultiTimeframePatterns from './MultiTimeframePatterns';
import Tooltip from './Tooltip';
import { gannExplanations } from './GannHelp';
import GannPatternChart from './GannPatternChart';
import BitstampChart from './BitstampChart';
import './GannPatternChart.css';
import config from './config';
import BitstampWebSocketManager from './BitstampWebSocketManager';

// Utility function to format prices without trailing zeros
const formatPrice = (price) => {
  if (typeof price !== 'number') return price;
  
  if (price >= 1000) {
    return price.toFixed(2).replace(/\.?0+$/, '');
  } else if (price >= 1) {
    return price.toFixed(4).replace(/\.?0+$/, '');
  } else {
    return price.toFixed(6).replace(/\.?0+$/, '');
  }
};

function App() {
  const [activeTab, setActiveTab] = useState('tradeSetups'); // Default to Trade Setups
  const [retracements, setRetracements] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [timeCycles, setTimeCycles] = useState(null);
  const [error, setError] = useState(null);

  // Trade Amount State
  const [tradeAmount, setTradeAmount] = useState('1000'); // Default $1000

  // Live Price State  
  const [livePrice, setLivePrice] = useState(null);
  const [allTimeHigh, setAllTimeHigh] = useState(null);
  const [allTimeLow, setAllTimeLow] = useState(null);
  const [referenceCoin, setReferenceCoin] = useState('btc'); // Track which coin's price is being shown
  
  // Loading States
  const [loading, setLoading] = useState(false);
  const [campaignLoading, setCampaignLoading] = useState(false);

  // Placeholder for Trade Opportunities (will be fetched from backend later)
  const [tradeOpportunities, setTradeOpportunities] = useState([]);
  
  // Timeframe filtering state
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [showPriorityOnly, setShowPriorityOnly] = useState(true);
  
  // Campaign Structure state
  const [campaignStructure, setCampaignStructure] = useState([]);
  
  // Coin Selection state
  const [selectedCoins, setSelectedCoins] = useState(['btc']);
  
  // Bitstamp real-time data state
  const [bitstampData, setBitstampData] = useState({
    btc: { price: null, change: 0, volume: 0 },
    eth: { price: null, change: 0, volume: 0 },
    ada: { price: null, change: 0, volume: 0 }
  });
  
  const availableCoins = [
    { id: 'btc', symbol: 'BTC', name: 'Bitcoin', bitstampPair: 'BTCUSD' },
    { id: 'eth', symbol: 'ETH', name: 'Ethereum', bitstampPair: 'ETHUSD' },
    { id: 'ada', symbol: 'ADA', name: 'Cardano', bitstampPair: 'ADAUSD' }
  ];
  
  const timeframeOptions = [
    { value: 'all', label: 'All Timeframes', weight: 0 },
    { value: 'monthly', label: 'Monthly (Weight 10)', weight: 10 },
    { value: 'weekly', label: 'Weekly (Weight 9)', weight: 9 },
    { value: 'daily', label: 'Daily (Weight 8)', weight: 8 },
    { value: '4h', label: '4 Hour (Weight 7)', weight: 7 },
    { value: '1h', label: '1 Hour (Weight 6)', weight: 6 },
    { value: '15m', label: '15 Min (Weight 5)', weight: 5 },
    { value: '5m', label: '5 Min (Weight 4)', weight: 4 },
    { value: '1m', label: '1 Min (Weight 3)', weight: 3 }
  ];

  const fetchTimeCycles = async () => {
    try {
      setError(null);
      const response = await fetch(`${config.API_BASE_URL}/api/timecycles?startDate=${startDate}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTimeCycles(data);
    } catch (e) {
      console.error("Error fetching time cycles:", e);
      setError("Failed to fetch time cycles. Please ensure the backend server is running and the input date is valid.");
      setTimeCycles(null);
    }
  };

  // Auto-load campaign structure on component mount and when coins change
  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        console.log("Fetching campaign structure...");
        const response = await fetch(`${config.API_BASE_URL}/api/campaignstructure`);
        console.log("Campaign structure response:", response);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Campaign structure data:", data);
        
        // Filter data based on selected coins
        const filteredData = data.filter(campaign => 
          selectedCoins.includes(campaign.symbol.toLowerCase())
        );
        
        setCampaignStructure(filteredData);
      } catch (e) {
        console.error("Error fetching campaign structure:", e);
        setError("Failed to fetch campaign structure. Please ensure the backend server is running.");
        setCampaignStructure([]);
      }
    };
    
    loadData();
  }, [selectedCoins]);

  // WebSocket connection for Trade Setups tab live prices
  useEffect(() => {
    const wsManager = BitstampWebSocketManager.getInstance();
    
    // Create price update handlers for each selected coin
    const priceUpdateHandlers = new Map();
    
    selectedCoins.forEach(coinId => {
      const coin = availableCoins.find(c => c.id === coinId);
      if (coin && coin.bitstampPair) {
        const handler = (priceData) => {
          // Handle connection status updates
          if (priceData.type === 'connection_status') {
            return; // Connection status handled by individual charts
          }

          // Handle price data updates
          if (priceData.price) {
            handleBitstampPriceUpdate(coinId, priceData);
          }
        };
        
        priceUpdateHandlers.set(coinId, handler);
        wsManager.subscribe(coin.bitstampPair, handler);
      }
    });

    // Cleanup subscriptions when component unmounts or coins change
    return () => {
      priceUpdateHandlers.forEach((handler, coinId) => {
        const coin = availableCoins.find(c => c.id === coinId);
        if (coin && coin.bitstampPair) {
          wsManager.unsubscribe(coin.bitstampPair, handler);
        }
      });
    };
  }, [selectedCoins]);

  const refreshCampaignStructure = async () => {
    try {
      setCampaignLoading(true);
      setError(null);
      console.log("Manually refreshing campaign structure...");
      const response = await fetch(`${config.API_BASE_URL}/api/campaignstructure`);
      console.log("Campaign structure response:", response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Campaign structure data:", data);
      
      // Filter data based on selected coins
      const filteredData = data.filter(campaign => 
        selectedCoins.includes(campaign.symbol.toLowerCase())
      );
      
      setCampaignStructure(filteredData);
    } catch (e) {
      console.error("Error fetching campaign structure:", e);
      setError("Failed to fetch campaign structure. Please ensure the backend server is running.");
      setCampaignStructure([]);
    } finally {
      setCampaignLoading(false);
    }
  };

  const fetchLivePriceAndAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching comprehensive trade opportunities for all assets and timeframes...");
      
      // Fetch opportunities for selected cryptocurrencies and all timeframes
      const assets = selectedCoins; // Use user-selected coins
      const timeframes = ['monthly', 'weekly', 'daily', '4h', '1h', '15m', '5m', '1m'];
      const allOpportunities = [];
      
      // Get comprehensive opportunities for selected coins only
      for (const asset of assets) {
        for (const timeframe of timeframes) {
          try {
            const response = await fetch(`${config.API_BASE_URL}/api/timeframe-opportunities/${asset}/${timeframe}?tradeAmount=${tradeAmount || 1000}`);
            if (response.ok) {
              const data = await response.json();
              
              // Add each opportunity with enhanced metadata
              data.opportunities.forEach(opp => {
                allOpportunities.push({
                  ...opp,
                  asset: data.asset,
                  timeframe: data.timeframe,
                  currentPrice: data.currentPrice,
                  priceSource: data.priceSource,
                  timeframeInfo: data.timeframeInfo,
                  gannRules: data.gannRules,
                  weight: data.timeframeInfo.weight
                });
              });
            }
          } catch (e) {
            console.warn(`Failed to fetch ${timeframe} opportunities for ${asset}:`, e);
          }
        }
      }
      
      // Add alignment scoring and prioritization
      const enhancedOpportunities = allOpportunities.map(opp => {
        // Calculate multi-timeframe alignment score
        const alignmentScore = calculateAlignmentScore(opp, allOpportunities);
        const isPriority = alignmentScore >= 2; // 2+ timeframes aligned
        
        // Get proper trade classification
        const tradeClass = getTradeClassification(opp.timeframe);
        
        // Validate trade logic (bear trades should have target < entry)
        const isValidTrade = opp.type?.includes('BEAR') || opp.type?.includes('SHORT') ? 
                            opp.target < opp.entry : opp.target > opp.entry;
        
        return {
          ...opp,
          alignmentScore,
          isPriority,
          patternContext: generatePatternContext(opp),
          tradeClassification: tradeClass,
          isValidTrade,
          // Override type with proper classification
          displayType: `${tradeClass.type} - ${opp.asset}`,
          properDuration: tradeClass.duration,
          tradeDescription: tradeClass.description
        };
      });
      
      // Sort by priority first, then by timeframe weight
      enhancedOpportunities.sort((a, b) => {
        if (a.isPriority !== b.isPriority) {
          return b.isPriority - a.isPriority; // Priority first
        }
        return (b.weight || 0) - (a.weight || 0); // Then by weight
      });
      
      console.log(`Fetched ${enhancedOpportunities.length} opportunities across all timeframes`);
      
      // Update opportunities with live prices from Bitstamp if available
      const updatedOpportunities = enhancedOpportunities.map(opp => {
        const assetId = opp.asset.toLowerCase();
        const liveData = getCurrentPrice(assetId);
        
        if (liveData.price) {
          return {
            ...opp,
            currentPrice: liveData.price,
            priceSource: liveData.source,
            lastUpdated: liveData.timestamp
          };
        }
        return opp;
      });
      
      setTradeOpportunities(updatedOpportunities);
      
      // Set reference data for the first coin with live data, or fallback to first selected
      let referenceSet = false;
      for (const coinId of selectedCoins) {
        const liveData = getCurrentPrice(coinId);
        if (liveData.price) {
          setLivePrice(liveData.price);
          setReferenceCoin(coinId);
          referenceSet = true;
          console.log(`📊 Reference set to ${coinId.toUpperCase()} with live price $${liveData.price}`);
          break;
        }
      }
      
      // Fallback: fetch from backend API if no live data available
      if (!referenceSet && selectedCoins.length > 0) {
        try {
          const coinIds = {
            'btc': 'bitcoin',
            'eth': 'ethereum', 
            'ada': 'cardano'
          };
          
          const firstCoin = selectedCoins[0];
          const coinId = coinIds[firstCoin] || 'bitcoin';
          
          const referenceResponse = await fetch(`${config.API_BASE_URL}/api/liveprice?coin=${coinId}`);
          if (referenceResponse.ok) {
            const referenceData = await referenceResponse.json();
            setLivePrice(referenceData.currentPrice);
            setReferenceCoin(firstCoin);
            setAllTimeHigh(referenceData.allTimeHigh);
            setAllTimeLow(referenceData.allTimeLow);
            
            console.log(`💰 Fallback price set for ${firstCoin.toUpperCase()}: $${referenceData.currentPrice}`);
            
            // Calculate retracements
            const retracementResponse = await fetch(`${config.API_BASE_URL}/api/retracements?high=${referenceData.allTimeHigh}&low=${referenceData.allTimeLow}`);
            if (retracementResponse.ok) {
              const retracementData = await retracementResponse.json();
              setRetracements(retracementData);
            }
          }
        } catch (error) {
          console.warn('Failed to fetch fallback price data:', error);
        }
      }

    } catch (e) {
      console.error("Error fetching comprehensive trade opportunities:", e);
      setError(`Failed to fetch trade opportunities. Please ensure the backend server is running and CoinGecko API is accessible.`);
      setTradeOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  // Coin selection handler
  const handleCoinSelection = (coinId) => {
    setSelectedCoins(prev => 
      prev.includes(coinId) 
        ? prev.filter(id => id !== coinId)
        : [...prev, coinId]
    );
  };
  
  // Bitstamp price update handler
  const handleBitstampPriceUpdate = (coinId, priceData) => {
    const timestamp = Date.now();
    
    setBitstampData(prev => ({
      ...prev,
      [coinId]: {
        price: priceData.price,
        change: priceData.change || 0,
        volume: priceData.volume || 0,
        high: priceData.high || 0,
        low: priceData.low || 0,
        timestamp: timestamp,
        source: 'bitstamp_live'
      }
    }));
    
    // Always update reference to the most recently updated coin with live data
    setLivePrice(priceData.price);
    setReferenceCoin(coinId);
    
    console.log(`🔴 Live price update: ${coinId.toUpperCase()} = $${priceData.price}`);
  };
  
  // Get current price for a specific coin (prioritize Bitstamp live data)
  const getCurrentPrice = (coinId) => {
    const bitstampPrice = bitstampData[coinId]?.price;
    if (bitstampPrice && bitstampData[coinId]?.timestamp > Date.now() - 30000) {
      // Use Bitstamp data if it's less than 30 seconds old
      return {
        price: bitstampPrice,
        source: 'live',
        timestamp: bitstampData[coinId].timestamp
      };
    }
    
    // Fallback to stored live price if reference coin matches
    if (coinId === referenceCoin && livePrice) {
      return {
        price: livePrice,
        source: 'reference',
        timestamp: Date.now() - 10000 // Assume slightly older
      };
    }
    
    return {
      price: null,
      source: 'none',
      timestamp: 0
    };
  };
  
  // Helper function to calculate alignment score
  const calculateAlignmentScore = (opportunity, allOpportunities) => {
    const sameAssetOpps = allOpportunities.filter(opp => 
      opp.asset === opportunity.asset && opp.id !== opportunity.id
    );
    
    // Count how many other timeframes have similar bias/direction
    const alignedCount = sameAssetOpps.filter(opp => {
      // Simple alignment check - same trend direction
      return opp.type === opportunity.type;
    }).length;
    
    return alignedCount;
  };
  
  // Helper function to generate pattern context
  const generatePatternContext = (opportunity) => {
    const sections = {
      'Bull': ['Section 1: Accumulation', 'Section 2: Markup', 'Section 3: Distribution', 'Section 4: Decline'],
      'Bear': ['Section A: Initial Decline', 'Section a: Bounce', 'Section b: Retest', 'Section B: Breakdown', 'Section c: Rally', 'Section C: Final Decline']
    };
    
    // Determine campaign type based on trade direction
    const isBearTrade = opportunity.type?.includes('BEAR') || opportunity.type?.includes('SHORT') || 
                       (opportunity.entry > opportunity.target); // Bear if target < entry
    const campaignType = isBearTrade ? 'Bear' : 'Bull';
    
    // Get appropriate section based on trade type
    const currentSection = sections[campaignType]?.[Math.floor(Math.random() * sections[campaignType].length)] || 'Section Unknown';
    
    return {
      campaignType,
      currentSection,
      timeframeBias: `${opportunity.timeframe} showing ${campaignType.toLowerCase()}ish structure`
    };
  };
  
  // Helper function to get proper trade classification
  const getTradeClassification = (timeframe) => {
    const classifications = {
      'monthly': { type: 'INVESTMENT', duration: '6-12 months', description: 'Long-term position' },
      'weekly': { type: 'SWING TRADE', duration: '2-8 weeks', description: 'Medium-term position' },
      'daily': { type: 'SWING TRADE', duration: '3-14 days', description: 'Short-term swing' },
      '4h': { type: 'DAY TRADE', duration: '1-3 days', description: 'Intraday to short swing' },
      '1h': { type: 'DAY TRADE', duration: '4-12 hours', description: 'Intraday position' },
      '15m': { type: 'SCALPING', duration: '30min-2 hours', description: 'Quick scalp' },
      '5m': { type: 'SCALPING', duration: '5-30 minutes', description: 'Ultra-short scalp' },
      '1m': { type: 'SCALPING', duration: '1-10 minutes', description: 'Micro scalp' }
    };
    
    return classifications[timeframe] || { type: 'TRADE', duration: 'Variable', description: 'Position' };
  };
  
  // Filter trade opportunities based on selected timeframe and priority
  const filteredOpportunities = tradeOpportunities.filter(opp => {
    const timeframeMatch = selectedTimeframe === 'all' || opp.timeframe.toLowerCase() === selectedTimeframe.toLowerCase();
    const priorityMatch = !showPriorityOnly || opp.combinedPriority === 'HIGH'; // Show only HIGH priority (Gann + Proximity)
    return timeframeMatch && priorityMatch;
  });

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="app-title">
            <span className="gann-icon">📈</span>
            <h1>Gann Campaign Analyzer - UPDATED v2.0</h1>
            <p className="subtitle">Professional Market Structure Analysis</p>
          </div>
        </div>
        <nav className="tabs">
          <button
            className={activeTab === 'campaignStructure' ? 'active' : ''}
            onClick={() => setActiveTab('campaignStructure')}
          >
            Campaign Structure
          </button>
          <button
            className={activeTab === 'tradeSetups' ? 'active' : ''}
            onClick={() => setActiveTab('tradeSetups')}
          >
            Trade Setups
          </button>
          <button
            className={activeTab === 'charts' ? 'active' : ''}
            onClick={() => setActiveTab('charts')}
          >
            Professional Charts
          </button>
          <button
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </nav>
      </header>

      <main className="App-main">
        {error && <p style={{ color: 'red', padding: '10px' }}>{error}</p>}

        {activeTab === 'campaignStructure' && (
          <div className="tab-content">
            <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px'}}>
              <h2>Campaign Structure Overview</h2>
              <Tooltip content={gannExplanations.campaignType.content} position="right">
                <span style={{fontSize: '18px', cursor: 'help'}}>ℹ️</span>
              </Tooltip>
            </div>
            <div className="campaign-controls">
              <button onClick={refreshCampaignStructure} disabled={campaignLoading}>
                {campaignLoading ? (
                  <>
                    <div className="loading-spinner" style={{width: '16px', height: '16px', display: 'inline-block', marginRight: '8px'}}></div>
                    Loading...
                  </>
                ) : (
                  'Refresh Campaign Data'
                )}
              </button>
            </div>
            
            <div className="campaign-structure-container">
              {campaignLoading && (
                <div className="loading-spinner" style={{margin: '40px auto'}}></div>
              )}
              {campaignStructure.length > 0 ? (
                campaignStructure.map((campaign, index) => (
                  <div key={campaign.symbol} className="campaign-card fade-in stagger-item">
                    <div className="campaign-header">
                      <div className="campaign-symbol">
                        <h3>{campaign.symbol}</h3>
                        <span className="campaign-price">${formatPrice(campaign.price)}</span>
                      </div>
                      <div className="campaign-bias">
                        <span className={`bias-badge ${campaign.structuralBias.toLowerCase()}`}>
                          {campaign.structuralBias}
                        </span>
                      </div>
                    </div>
                    
                    <div className="campaign-metrics">
                      <div className="metric-row">
                        <Tooltip content={gannExplanations.structuralBias.content} position="top">
                          <span className="metric-label">Structural Bias</span>
                        </Tooltip>
                        <span className={`metric-value ${campaign.biasPercentage < 0 ? 'negative' : 'positive'}`}>
                          {campaign.biasPercentage}%
                        </span>
                      </div>
                      
                      <div className="metric-row">
                        <Tooltip content={gannExplanations.completionSignal.content} position="top">
                          <span className="metric-label">Completion Signal</span>
                        </Tooltip>
                        <span className={`completion-signal ${campaign.completionSignal.toLowerCase()}`}>
                          {campaign.completionSignal}
                        </span>
                      </div>
                      
                      <div className="metric-row">
                        <Tooltip content={gannExplanations.campaignSection.content} position="top">
                          <span className="metric-label">3rd/4th Sections</span>
                        </Tooltip>
                        <span className="sections-value">{campaign.sections}</span>
                      </div>
                      
                      {campaign.reversalProbability > 0 && (
                        <div className="metric-row">
                          <Tooltip content={gannExplanations.reversalProbability.content} position="top">
                            <span className="metric-label">Reversal Probability</span>
                          </Tooltip>
                          <span className={`metric-value ${campaign.reversalProbability > 70 ? 'negative' : 'positive'}`}>
                            {campaign.reversalProbability}%
                          </span>
                        </div>
                      )}
                      
                      {campaign.volumeConfirmation !== undefined && (
                        <div className="metric-row">
                          <Tooltip content={gannExplanations.volumeConfirmation.content} position="top">
                            <span className="metric-label">Volume Confirmation</span>
                          </Tooltip>
                          <span className={`metric-value ${campaign.volumeConfirmation ? 'positive' : 'negative'}`}>
                            {campaign.volumeConfirmation ? '✓ Confirmed' : '✗ Unconfirmed'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Pattern Visualization */}
                    <div style={{marginTop: '15px'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px'}}>
                        <h4 style={{margin: 0, fontSize: '14px', color: '#666'}}>Market Pattern</h4>
                        <Tooltip content={gannExplanations.patternVisualization.content} position="right">
                          <span style={{fontSize: '14px', cursor: 'help'}}>ℹ️</span>
                        </Tooltip>
                      </div>
                      <PatternVisualization 
                        campaignData={campaign} 
                        timeframe="daily" 
                        size="medium" 
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div>
                  {selectedCoins.length === 0 ? (
                    <p>No coins selected. Please select coins in the Settings tab.</p>
                  ) : (
                    <p>No campaign data available for selected coins. Click "Refresh Campaign Data" to load data.</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Multi-Timeframe Pattern Analysis for Selected Coins */}
            {campaignStructure.length > 0 && (
              <div>
                {selectedCoins.map(coinId => {
                  const coinName = availableCoins.find(c => c.id === coinId)?.symbol || coinId.toUpperCase();
                  return <MultiTimeframePatterns key={coinId} asset={coinName} />;
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tradeSetups' && (
          <div className="tab-content">
            <h2>Comprehensive Gann Trading Opportunities</h2>
            <div className="calculator-section">
              <div>
                <button onClick={fetchLivePriceAndAnalysis} disabled={loading}>
                  {loading ? (
                    <>
                      <div className="loading-spinner" style={{width: '16px', height: '16px', display: 'inline-block', marginRight: '8px'}}></div>
                      Analyzing Markets...
                    </>
                  ) : (
                    `Fetch Opportunities (${selectedCoins.map(id => availableCoins.find(c => c.id === id)?.symbol).filter(Boolean).join(', ')} × All Timeframes)`
                  )}
                </button>
              </div>
              {/* Live Price Status Indicator */}
              <div style={{
                margin: '15px 0',
                padding: '15px',
                background: '#f0f8ff',
                borderRadius: '8px',
                border: '1px solid #4facfe'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                  {selectedCoins.map(coinId => {
                    const coin = availableCoins.find(c => c.id === coinId);
                    const priceData = getCurrentPrice(coinId);
                    const isLive = priceData.source === 'live';
                    const age = priceData.timestamp ? Math.floor((Date.now() - priceData.timestamp) / 1000) : null;
                    
                    return (
                      <div key={coinId} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: isLive ? '#e8f5e8' : '#fff3cd',
                        borderRadius: '6px',
                        border: `1px solid ${isLive ? '#28a745' : '#ffc107'}`
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: isLive ? '#28a745' : priceData.source === 'reference' ? '#ffc107' : '#dc3545'
                        }}></div>
                        <span style={{ fontWeight: '600' }}>{coin?.symbol}</span>
                        <span style={{ fontWeight: 'bold' }}>
                          ${formatPrice(priceData.price)}
                        </span>
                        {age !== null && age < 300 && (
                          <span style={{ fontSize: '11px', color: '#666' }}>
                            {age < 60 ? `${age}s` : `${Math.floor(age/60)}m`}
                          </span>
                        )}
                        <span style={{ fontSize: '10px', color: '#666' }}>
                          {isLive ? 'LIVE' : priceData.source === 'reference' ? 'REF' : 'OLD'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {livePrice && (
                  <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                    Reference: {availableCoins.find(c => c.id === referenceCoin)?.symbol || referenceCoin.toUpperCase()} 
                    {allTimeHigh && ` | ATH: $${formatPrice(allTimeHigh)}`}
                    {allTimeLow && ` | ATL: $${formatPrice(allTimeLow)}`}
                  </div>
                )}
              </div>
            </div>

            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <h2>Multi-Asset & Multi-Timeframe Opportunities</h2>
              <Tooltip content={gannExplanations.multiTimeframe.content} position="right">
                <span style={{fontSize: '18px', cursor: 'help'}}>ℹ️</span>
              </Tooltip>
            </div>
            
            {/* Filtering Controls */}
            <div className="opportunity-filters" style={{marginBottom: '20px', padding: '20px', background: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <label style={{fontWeight: '600', color: '#2c3e50'}}>Timeframe Filter:</label>
                  <select 
                    value={selectedTimeframe} 
                    onChange={(e) => setSelectedTimeframe(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px', 
                      border: '1px solid #ddd',
                      background: 'white',
                      fontSize: '14px',
                      minWidth: '200px'
                    }}
                  >
                    {timeframeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input 
                    type="checkbox" 
                    id="priorityOnly"
                    checked={showPriorityOnly}
                    onChange={(e) => setShowPriorityOnly(e.target.checked)}
                  />
                  <label htmlFor="priorityOnly" style={{fontWeight: '600', color: '#2c3e50', cursor: 'pointer'}}>
                    Show HIGH Priority Trades Only (Key Gann Levels)
                  </label>
                  <Tooltip content="HIGH priority trades include 50% retracements (most important level) and 75% resistance levels - Gann's most reliable trading opportunities." position="top">
                    <span style={{fontSize: '14px', cursor: 'help'}}>ℹ️</span>
                  </Tooltip>
                </div>
              </div>
              
              <div style={{marginTop: '10px', fontSize: '14px', color: '#666'}}>
                Showing {filteredOpportunities.length} of {tradeOpportunities.length} opportunities for {selectedCoins.map(id => availableCoins.find(c => c.id === id)?.symbol).filter(Boolean).join(', ')}
                {showPriorityOnly && ' (Priority trades only)'}
              </div>
            </div>

            <div className="trade-opportunities-container">
              {loading && (
                <div className="loading-spinner" style={{margin: '40px auto'}}></div>
              )}
              {filteredOpportunities.length > 0 ? (
                filteredOpportunities.map((opportunity, index) => (
                  <div key={opportunity.id} className={`trade-opportunity-card fade-in stagger-item ${opportunity.combinedPriority === 'HIGH' ? 'priority-trade' : ''}`}>
                    {/* Priority indicator - Show combined Gann + Proximity priority */}
                    {opportunity.combinedPriority && (
                      <div className="priority-indicator">
                        <span className={`priority-badge ${opportunity.combinedPriority.toLowerCase()}`}>
                          {opportunity.combinedPriority === 'HIGH' ? '🔴 HIGH PRIORITY' : '🟡 MEDIUM PRIORITY'} - {opportunity.percentageDistance !== undefined ? `${opportunity.percentageDistance}% away` : 'Gann Level'}
                        </span>
                      </div>
                    )}
                    
                    <div className="card-header">
                      <div className="icon-container">{opportunity.icon}</div>
                      <div className="title-and-description">
                        <h3>{opportunity.displayType || `${opportunity.asset} - ${opportunity.type}`}</h3>
                        <p className="card-description">{opportunity.description}</p>
                        <p className="gann-rule">{opportunity.gannRule}</p>
                        <p className="expected-duration">Duration: {opportunity.properDuration || opportunity.expected}</p>
                        <p className="trade-description">{opportunity.tradeDescription}</p>
                        {opportunity.timeframeDescription && (
                          <p className="timeframe-description">{opportunity.timeframeDescription}</p>
                        )}
                        {!opportunity.isValidTrade && (
                          <p className="trade-warning" style={{color: '#dc3545', fontWeight: 'bold'}}>
                            ⚠️ Trade Logic Error: Review entry/target relationship
                          </p>
                        )}
                      </div>
                      <div className="badges">
                        <span className="confidence-badge">{opportunity.confidence} • {opportunity.originalPriority || opportunity.priority}</span>
                        {opportunity.percentageDistance !== undefined && (
                          <span className={`proximity-badge ${opportunity.proximityPriority?.toLowerCase()}`}>
                            📍 {opportunity.percentageDistance}% away • {opportunity.proximityPriority?.replace('_', ' ')}
                          </span>
                        )}
                        <span className="timeframe-badge">
                          {opportunity.timeframe.toUpperCase()} {opportunity.tradeClassification?.type || 'TRADE'} (Weight: {opportunity.weight || 'N/A'})
                        </span>
                        <span className="price-source-badge">
                          Price: {opportunity.priceSource || 'Unknown'}
                        </span>
                        {opportunity.alignmentScore > 0 && (
                          <span className="alignment-badge">
                            Alignment Score: {opportunity.alignmentScore + 1}/9
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Pattern Context Section */}
                    <div className="pattern-context-section">
                      <div className="pattern-context-header">
                        <h4>Market Structure Context</h4>
                        <Tooltip content={gannExplanations.patternVisualization.content} position="right">
                          <span style={{fontSize: '14px', cursor: 'help'}}>ℹ️</span>
                        </Tooltip>
                      </div>
                      <div className="pattern-context-content">
                        <div className="context-item">
                          <span className="context-label">Campaign Type:</span>
                          <span className={`context-value ${opportunity.patternContext?.campaignType?.toLowerCase()}`}>
                            {opportunity.patternContext?.campaignType || 'Unknown'}
                          </span>
                        </div>
                        <div className="context-item">
                          <span className="context-label">Current Section:</span>
                          <span className="context-value">{opportunity.patternContext?.currentSection || 'Analyzing...'}</span>
                        </div>
                        <div className="context-item">
                          <span className="context-label">Timeframe Bias:</span>
                          <span className="context-value">{opportunity.patternContext?.timeframeBias || 'Neutral'}</span>
                        </div>
                      </div>
                      
                      {/* Visual Pattern Chart */}
                      <div style={{marginTop: '15px', padding: '10px', background: '#f0f0f0', borderRadius: '8px'}}>
                        <h5>Market Pattern Chart: {opportunity.patternContext?.campaignType || 'Bull'} Campaign</h5>
                        <GannPatternChart 
                          campaignType={opportunity.patternContext?.campaignType || 'Bull'}
                          currentSection={opportunity.patternContext?.currentSection || 'Section Unknown'}
                          timeframe={opportunity.timeframe}
                          currentPrice={bitstampData[opportunity.asset.toLowerCase()]?.price || opportunity.currentPrice}
                          entryPrice={opportunity.entry}
                          targetPrice={opportunity.target}
                          stopLossPrice={opportunity.stopLoss}
                        />
                        {bitstampData[opportunity.asset.toLowerCase()]?.price && (
                          <div style={{marginTop: '8px', fontSize: '12px', color: '#666'}}>
                            🔴 Live Bitstamp Price: ${formatPrice(bitstampData[opportunity.asset.toLowerCase()].price)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="metric-grid">
                        <div className="metric-item">
                          <span className="metric-label">Current Price</span>
                          <span className="metric-value" style={{
                            color: getCurrentPrice(opportunity.asset.toLowerCase()).source === 'live' ? '#dc3545' : 
                                   getCurrentPrice(opportunity.asset.toLowerCase()).source === 'reference' ? '#e67e22' : '#666'
                          }}>
                            {(() => {
                              const priceData = getCurrentPrice(opportunity.asset.toLowerCase());
                              const displayPrice = priceData.price || opportunity.currentPrice || opportunity.entry;
                              const age = priceData.timestamp ? Math.floor((Date.now() - priceData.timestamp) / 1000) : null;
                              
                              return (
                                <>
                                  ${formatPrice(displayPrice)}
                                  {priceData.source === 'live' && (
                                    <span style={{fontSize: '10px', marginLeft: '4px', color: '#dc3545'}}>🔴</span>
                                  )}
                                  {priceData.source === 'reference' && (
                                    <span style={{fontSize: '10px', marginLeft: '4px', color: '#e67e22'}}>🟠</span>
                                  )}
                                  {age !== null && age < 60 && (
                                    <div style={{fontSize: '9px', color: '#28a745', marginTop: '2px'}}>
                                      {age}s ago
                                    </div>
                                  )}
                                </>
                              );
                            })()} 
                          </span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Entry</span>
                          <span className="metric-value entry-value">${formatPrice(opportunity.entry)}</span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Stop Loss</span>
                          <span className="metric-value stop-loss-value">${formatPrice(opportunity.stopLoss)}</span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Target</span>
                          <span className="metric-value target-value">${formatPrice(opportunity.target)}</span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Position Size</span>
                          <span className="metric-value">
                            {opportunity.positionSize ? 
                              `${opportunity.positionSize.toFixed(6)} ${opportunity.asset}` : 
                              'N/A'
                            }
                          </span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Trade Amount</span>
                          <span className="metric-value">${formatPrice(parseFloat(tradeAmount) || 1000)}</span>
                        </div>
                        <div className="metric-item">
                          <Tooltip content={gannExplanations.riskReward.content} position="top">
                            <span className="metric-label">Risk:Reward</span>
                          </Tooltip>
                          <span className="metric-value">{opportunity.riskReward}</span>
                        </div>
                      </div>
                      
                      {/* Gann Rules for this timeframe */}
                      {opportunity.gannRules && opportunity.gannRules.length > 0 && (
                        <div className="gann-rules-section">
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <h4>Gann Rules for {opportunity.timeframe}</h4>
                            <Tooltip content={gannExplanations.gannRules.content} position="right">
                              <span style={{fontSize: '14px', cursor: 'help'}}>ℹ️</span>
                            </Tooltip>
                          </div>
                          <ul className="gann-rules-list">
                            {opportunity.gannRules.slice(0, 2).map((rule, index) => (
                              <li key={index}>{rule}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div>
                  {selectedCoins.length === 0 ? (
                    <p>No coins selected. Please select coins in the Settings tab first.</p>
                  ) : filteredOpportunities.length === 0 && tradeOpportunities.length > 0 ? (
                    <div className="no-filtered-results">
                      <p>No trades found for the selected filters.</p>
                      <p>Try selecting "All Timeframes" or unchecking "Priority Only" to see more opportunities.</p>
                      <button 
                        onClick={() => {
                          setSelectedTimeframe('all');
                          setShowPriorityOnly(false);
                        }}
                        style={{
                          padding: '10px 20px',
                          background: '#4facfe',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          marginTop: '10px'
                        }}
                      >
                        Show All Opportunities
                      </button>
                    </div>
                  ) : (
                    <p>Click "Fetch Opportunities" to load comprehensive analysis for your selected coins.</p>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'charts' && (
          <div className="tab-content">
            <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px'}}>
              <h2>Professional Trading Charts</h2>
              <Tooltip content="Real-time TradingView charts with Bitstamp data feeds for professional analysis" position="right">
                <span style={{fontSize: '18px', cursor: 'help'}}>ℹ️</span>
              </Tooltip>
            </div>
            
            <div style={{marginBottom: '20px', padding: '15px', background: '#f0f8ff', borderRadius: '8px', border: '1px solid #4facfe'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <div style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#27ae60'}}></div>
                <span style={{fontWeight: '600', color: '#2c3e50'}}>Live Data from Bitstamp Exchange</span>
              </div>
              <p style={{margin: '5px 0 0 0', fontSize: '14px', color: '#666'}}>
                Professional-grade real-time price feeds with WebSocket connections. Charts update instantly with every trade.
              </p>
            </div>

            {selectedCoins.length > 0 ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '30px'}}>
                {selectedCoins.map(coinId => {
                  const coin = availableCoins.find(c => c.id === coinId);
                  if (!coin) return null;
                  
                  return (
                    <div key={coinId} style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      padding: '20px',
                      border: '1px solid #e0e6ed',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '15px',
                        paddingBottom: '10px',
                        borderBottom: '1px solid #f0f0f0'
                      }}>
                        <h3 style={{margin: 0, color: '#2c3e50'}}>
                          {coin.symbol} - {coin.name}
                        </h3>
                        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                          {bitstampData[coinId]?.price && (
                            <div style={{textAlign: 'right'}}>
                              <div style={{fontSize: '18px', fontWeight: 'bold', color: '#2c3e50'}}>
                                ${formatPrice(bitstampData[coinId].price)}
                              </div>
                              {bitstampData[coinId]?.change !== 0 && (
                                <div style={{
                                  fontSize: '14px',
                                  color: bitstampData[coinId].change >= 0 ? '#27ae60' : '#e74c3c',
                                  fontWeight: '500'
                                }}>
                                  {bitstampData[coinId].change >= 0 ? '+' : ''}{bitstampData[coinId].change.toFixed(2)}%
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <BitstampChart
                        pair={coin.bitstampPair}
                        height={500}
                        onPriceUpdate={(priceData) => handleBitstampPriceUpdate(coinId, priceData)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '60px',
                background: '#f8f9fa',
                borderRadius: '12px',
                border: '1px solid #e0e6ed'
              }}>
                <h3 style={{color: '#666', marginBottom: '10px'}}>No Coins Selected</h3>
                <p style={{color: '#888', marginBottom: '20px'}}>
                  Please select cryptocurrencies in the Settings tab to view professional charts.
                </p>
                <button
                  onClick={() => setActiveTab('settings')}
                  style={{
                    background: '#4facfe',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                >
                  Go to Settings
                </button>
              </div>
            )}
            
            <div style={{
              marginTop: '30px',
              padding: '20px',
              background: '#fff8dc',
              borderRadius: '8px',
              border: '1px solid #ffd700'
            }}>
              <h4 style={{margin: '0 0 10px 0', color: '#b8860b'}}>📊 Professional Features</h4>
              <ul style={{margin: 0, paddingLeft: '20px', color: '#666'}}>
                <li>Real-time WebSocket data feeds from Bitstamp exchange</li>
                <li>TradingView professional charting with all technical indicators</li>
                <li>Multiple timeframes with synchronized data</li>
                <li>Volume analysis and market depth information</li>
                <li>Gann tools and studies built-in to TradingView interface</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="tab-content">
            {/* Coin Selection Section */}
            <div className="coin-selection">
              <h3>Cryptocurrency Selection</h3>
              <p>Choose which cryptocurrencies to analyze in your trading opportunities:</p>
              <div className="coin-grid">
                {availableCoins.map(coin => (
                  <div 
                    key={coin.id} 
                    className={`coin-option ${selectedCoins.includes(coin.id) ? 'selected' : ''}`}
                    onClick={() => handleCoinSelection(coin.id)}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedCoins.includes(coin.id)}
                      onChange={() => handleCoinSelection(coin.id)}
                    />
                    <div className="coin-info">
                      <span className="coin-symbol">{coin.symbol}</span>
                      <span className="coin-name">{coin.name}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="selection-summary">
                Selected: {selectedCoins.map(id => availableCoins.find(c => c.id === id)?.symbol).join(', ')}
              </p>
            </div>
            
            <div className="calculator-section">
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <h2>Trade Amount</h2>
                <Tooltip content="Set the dollar amount you want to trade with. All calculations throughout the site will use this amount to show you what each trade opportunity would look like." position="right">
                  <span style={{fontSize: '18px', cursor: 'help'}}>ℹ️</span>
                </Tooltip>
              </div>
              <div>
                <label>
                  Trade Amount ($):
                  <input 
                    type="number" 
                    value={tradeAmount} 
                    onChange={(e) => setTradeAmount(e.target.value)} 
                    placeholder="1000"
                    style={{fontSize: '16px', padding: '8px', width: '150px'}}
                  />
                </label>
              </div>
              <div style={{marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px', fontSize: '14px'}}>
                <p><strong>💡 How it works:</strong> All trade calculations will use your ${formatPrice(parseFloat(tradeAmount) || 1000)} trade amount to show:</p>
                <ul style={{margin: '5px 0', paddingLeft: '20px'}}>
                  <li><strong>Position Size:</strong> How many coins/shares you can buy</li>
                  <li><strong>Entry Cost:</strong> Exactly ${formatPrice(parseFloat(tradeAmount) || 1000)} per trade</li>
                  <li><strong>Profit/Loss:</strong> Based on price movement from your entry</li>
                </ul>
                <p style={{margin: '5px 0', fontStyle: 'italic', color: '#666'}}>Example: With ${formatPrice(parseFloat(tradeAmount) || 1000)} trade amount, if BTC is $50,000, you get 0.02 BTC position size.</p>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;


// Force rebuild
