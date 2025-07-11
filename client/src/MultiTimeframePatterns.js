import React, { useState, useEffect } from 'react';
import PatternVisualization from './PatternVisualization';

const MultiTimeframePatterns = ({ asset = 'BTC' }) => {
  const [timeframeData, setTimeframeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const timeframes = [
    { key: 'monthly', label: 'Monthly', weight: 10 },
    { key: 'weekly', label: 'Weekly', weight: 9 },
    { key: 'daily', label: 'Daily', weight: 8 },
    { key: '4h', label: '4H', weight: 7 },
    { key: '1h', label: '1H', weight: 6 },
    { key: '15m', label: '15M', weight: 5 },
    { key: '5m', label: '5M', weight: 4 },
    { key: '1m', label: '1M', weight: 3 }
  ];

  const fetchMultiTimeframeData = async () => {
    if (!asset) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching multi-timeframe data for ${asset}...`);
      const response = await fetch(`http://localhost:5000/api/multitimeframe/${asset.toLowerCase()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Multi-timeframe data:', data);
      setTimeframeData(data);
    } catch (e) {
      console.error('Error fetching multi-timeframe data:', e);
      setError('Failed to fetch multi-timeframe pattern data');
      setTimeframeData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMultiTimeframeData();
  }, [asset]);

  if (loading) {
    return (
      <div className="multi-timeframe-loading">
        <p>Loading multi-timeframe patterns for {asset}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="multi-timeframe-error">
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={fetchMultiTimeframeData}>Retry</button>
      </div>
    );
  }

  if (!timeframeData) {
    return (
      <div className="multi-timeframe-placeholder">
        <p>No multi-timeframe data available</p>
      </div>
    );
  }

  const { timeframes: data, alignment } = timeframeData;

  return (
    <div className="multi-timeframe-patterns">
      <div className="multi-timeframe-header">
        <h3>Multi-Timeframe Pattern Analysis - {asset}</h3>
        <button onClick={fetchMultiTimeframeData} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {/* Overall Alignment Summary */}
      <div className="alignment-summary">
        <div className="alignment-card">
          <h4>Overall Market Alignment</h4>
          <div className="alignment-metrics">
            <div className="alignment-gauge">
              <div className="gauge-label">Bullish Alignment</div>
              <div className="gauge-bar">
                <div 
                  className="gauge-fill"
                  style={{ 
                    width: `${alignment?.overallAlignment || 0}%`,
                    backgroundColor: alignment?.overallAlignment > 70 ? '#28a745' : 
                                   alignment?.overallAlignment < 30 ? '#dc3545' : '#ffc107'
                  }}
                ></div>
              </div>
              <div className="gauge-value">{alignment?.overallAlignment || 0}%</div>
            </div>
            
            <div className="alignment-details">
              <div className="detail-item">
                <span>Dominant Trend:</span>
                <span className={`trend-indicator ${alignment?.dominantTrend?.toLowerCase()}`}>
                  {alignment?.dominantTrend || 'UNKNOWN'}
                </span>
              </div>
              <div className="detail-item">
                <span>Recommended Action:</span>
                <span className="action-indicator">
                  {alignment?.recommendedAction?.replace('_', ' ') || 'WAIT'}
                </span>
              </div>
              {alignment?.highestPrioritySignal && (
                <div className="detail-item">
                  <span>Priority Signal:</span>
                  <span className="priority-signal">
                    {alignment.highestPrioritySignal.timeframe.toUpperCase()} - 
                    {alignment.highestPrioritySignal.signal.replace('_', ' ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Individual Timeframe Patterns */}
      <div className="timeframe-patterns-grid">
        {timeframes.map(tf => {
          const tfData = data[tf.key];
          if (!tfData) return null;

          // Transform backend data to match our PatternVisualization component
          const campaignData = {
            campaignType: tfData.structuralBias === 'BULL' ? 'bull' : 'bear',
            currentSection: tfData.currentSection,
            structuralBias: tfData.structuralBias,
            reversalProbability: tfData.reversalProbability,
            sections: `${tfData.currentSection}/8`,
            nextExpectedMove: tfData.reversalProbability > 70 ? 
              'REVERSAL EXPECTED' : 
              `Continue ${tfData.structuralBias} trend`,
            volumeConfirmation: Math.random() > 0.3 // Simulated for now
          };

          return (
            <div key={tf.key} className="timeframe-pattern-card">
              <div className="timeframe-header">
                <div className="timeframe-title">
                  <h4>{tf.label}</h4>
                  <span className="timeframe-weight">Weight: {tf.weight}</span>
                </div>
                <div className="timeframe-status">
                  <span className={`bias-badge ${tfData.structuralBias.toLowerCase()}`}>
                    {tfData.structuralBias}
                  </span>
                  {tfData.reversalProbability > 70 && (
                    <span className="reversal-badge">⚠️ REVERSAL</span>
                  )}
                </div>
              </div>
              
              <PatternVisualization 
                campaignData={campaignData}
                timeframe={tf.key}
                size="small"
              />
              
              <div className="timeframe-metrics">
                <div className="metric-small">
                  <span>Section:</span>
                  <span>{tfData.currentSection}</span>
                </div>
                <div className="metric-small">
                  <span>Reversal:</span>
                  <span className={tfData.reversalProbability > 70 ? 'high-risk' : 'low-risk'}>
                    {tfData.reversalProbability}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeframe Hierarchy Explanation */}
      <div className="hierarchy-explanation">
        <h4>Gann's Timeframe Hierarchy Rules</h4>
        <div className="hierarchy-rules">
          <div className="rule">
            <strong>Monthly (Weight 10):</strong> Drives all analysis decisions
          </div>
          <div className="rule">
            <strong>Higher Timeframes:</strong> Override lower timeframes
          </div>
          <div className="rule">
            <strong>Alignment:</strong> Best trades when multiple timeframes align
          </div>
          <div className="rule">
            <strong>4th Sections:</strong> Highest probability reversal signals
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiTimeframePatterns;