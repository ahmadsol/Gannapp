import React, { useState } from 'react';

const GannTester = () => {
  const [testData, setTestData] = useState({
    highs: '',
    lows: '',
    closes: '',
    volume: '',
    dates: '',
    currentPrice: '',
    timeframe: 'daily',
    expectedSection: '',
    expectedBias: '',
    symbol: 'TEST'
  });

  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (field, value) => {
    setTestData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const runGannTest = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Parse comma-separated values into arrays
      const parsedData = {
        highs: testData.highs.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v)),
        lows: testData.lows.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v)),
        closes: testData.closes.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v)),
        volume: testData.volume ? testData.volume.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v)) : [],
        dates: testData.dates.split(',').map(v => v.trim()),
        currentPrice: parseFloat(testData.currentPrice),
        timeframe: testData.timeframe,
        expectedSection: testData.expectedSection,
        expectedBias: testData.expectedBias
      };

      console.log('Sending test data:', parsedData);

      const response = await fetch('http://localhost:5000/api/test-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(parsedData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      setTestResults(results);
      console.log('Test results:', results);

    } catch (e) {
      console.error('Error running Gann test:', e);
      setError(`Test failed: ${e.message}`);
      setTestResults(null);
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = (sampleType) => {
    const samples = {
      bullish: {
        highs: '50, 65, 85, 110, 95, 80, 75, 70',
        lows: '40, 45, 60, 80, 70, 60, 55, 50',
        closes: '45, 60, 80, 105, 85, 70, 65, 60',
        volume: '100000, 150000, 250000, 300000, 200000, 150000, 100000, 80000',
        dates: '2023-01, 2023-02, 2023-03, 2023-04, 2023-05, 2023-06, 2023-07, 2023-08',
        currentPrice: '60',
        expectedSection: '4',
        expectedBias: 'BEAR',
        symbol: 'BULL-TEST'
      },
      bearish: {
        highs: '100, 95, 85, 75, 80, 70, 65, 60',
        lows: '80, 70, 60, 50, 55, 45, 40, 35',
        closes: '90, 80, 70, 60, 65, 55, 50, 45',
        volume: '80000, 120000, 180000, 220000, 150000, 100000, 90000, 70000',
        dates: '2023-01, 2023-02, 2023-03, 2023-04, 2023-05, 2023-06, 2023-07, 2023-08',
        currentPrice: '45',
        expectedSection: 'C',
        expectedBias: 'BEAR',
        symbol: 'BEAR-TEST'
      },
      retracement: {
        highs: '1000, 950, 900, 850, 800, 750, 700, 650',
        lows: '0, 50, 100, 150, 200, 250, 300, 350',
        closes: '500, 500, 500, 500, 500, 500, 500, 500',
        volume: '100000, 100000, 100000, 100000, 100000, 100000, 100000, 100000',
        dates: '2023-01, 2023-02, 2023-03, 2023-04, 2023-05, 2023-06, 2023-07, 2023-08',
        currentPrice: '500',
        expectedSection: '',
        expectedBias: '',
        symbol: '50%-TEST'
      }
    };

    const sample = samples[sampleType];
    if (sample) {
      Object.keys(sample).forEach(key => {
        handleInputChange(key, sample[key]);
      });
    }
  };

  return (
    <div className="gann-tester">
      <h2>Gann Analysis Testing & Validation</h2>
      <p className="tester-description">
        Input historical price data to test and validate our Gann analysis engine. 
        Compare the results with your manual analysis to verify accuracy.
      </p>

      {/* Sample Data Buttons */}
      <div className="sample-data-section">
        <h3>Quick Test Samples</h3>
        <div className="sample-buttons">
          <button onClick={() => loadSampleData('bullish')} className="sample-btn bullish">
            📈 Load Bull Market Sample
          </button>
          <button onClick={() => loadSampleData('bearish')} className="sample-btn bearish">
            📉 Load Bear Market Sample  
          </button>
          <button onClick={() => loadSampleData('retracement')} className="sample-btn retracement">
            🎯 Load 50% Retracement Test
          </button>
        </div>
      </div>

      {/* Input Form */}
      <div className="test-input-form">
        <h3>Manual Data Input</h3>
        
        <div className="input-grid">
          <div className="input-group">
            <label>Symbol/Name:</label>
            <input 
              type="text"
              value={testData.symbol}
              onChange={(e) => handleInputChange('symbol', e.target.value)}
              placeholder="e.g., BTC-TEST"
            />
          </div>

          <div className="input-group">
            <label>Timeframe:</label>
            <select 
              value={testData.timeframe}
              onChange={(e) => handleInputChange('timeframe', e.target.value)}
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
              <option value="4h">4H</option>
              <option value="1h">1H</option>
            </select>
          </div>

          <div className="input-group">
            <label>Current Price:</label>
            <input 
              type="number"
              value={testData.currentPrice}
              onChange={(e) => handleInputChange('currentPrice', e.target.value)}
              placeholder="e.g., 65420"
            />
          </div>
        </div>

        <div className="input-group">
          <label>Highs (comma-separated):</label>
          <input 
            type="text"
            value={testData.highs}
            onChange={(e) => handleInputChange('highs', e.target.value)}
            placeholder="e.g., 100, 120, 150, 180, 160, 140, 130, 125"
          />
        </div>

        <div className="input-group">
          <label>Lows (comma-separated):</label>
          <input 
            type="text"
            value={testData.lows}
            onChange={(e) => handleInputChange('lows', e.target.value)}
            placeholder="e.g., 80, 90, 110, 140, 120, 100, 95, 90"
          />
        </div>

        <div className="input-group">
          <label>Closes (comma-separated):</label>
          <input 
            type="text"
            value={testData.closes}
            onChange={(e) => handleInputChange('closes', e.target.value)}
            placeholder="e.g., 95, 115, 145, 175, 155, 135, 125, 120"
          />
        </div>

        <div className="input-group">
          <label>Volume (optional, comma-separated):</label>
          <input 
            type="text"
            value={testData.volume}
            onChange={(e) => handleInputChange('volume', e.target.value)}
            placeholder="e.g., 1000000, 1200000, 1500000, 1800000, 1400000, 1000000, 800000, 600000"
          />
        </div>

        <div className="input-group">
          <label>Dates (comma-separated):</label>
          <input 
            type="text"
            value={testData.dates}
            onChange={(e) => handleInputChange('dates', e.target.value)}
            placeholder="e.g., 2023-01, 2023-02, 2023-03, 2023-04, 2023-05, 2023-06, 2023-07, 2023-08"
          />
        </div>

        <div className="input-grid">
          <div className="input-group">
            <label>Expected Section (for validation):</label>
            <input 
              type="text"
              value={testData.expectedSection}
              onChange={(e) => handleInputChange('expectedSection', e.target.value)}
              placeholder="e.g., 1, 2, 3, 4, A, a, b, B, c, C"
            />
          </div>

          <div className="input-group">
            <label>Expected Bias (for validation):</label>
            <select 
              value={testData.expectedBias}
              onChange={(e) => handleInputChange('expectedBias', e.target.value)}
            >
              <option value="">Select Expected Bias</option>
              <option value="BULL">BULL</option>
              <option value="BEAR">BEAR</option>
              <option value="NEUTRAL">NEUTRAL</option>
            </select>
          </div>
        </div>

        <button 
          onClick={runGannTest}
          disabled={loading || !testData.highs || !testData.lows || !testData.closes}
          className="run-test-btn"
        >
          {loading ? 'Running Analysis...' : '🔍 Run Gann Analysis Test'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="test-error">
          ❌ {error}
        </div>
      )}

      {/* Results Display */}
      {testResults && (
        <div className="test-results">
          <h3>📊 Analysis Results for {testData.symbol}</h3>
          
          {/* Validation Summary */}
          <div className="validation-summary">
            <h4>✅ Validation Summary</h4>
            <div className="validation-grid">
              {testResults.validation.expectedSection && (
                <div className={`validation-item ${testResults.validation.sectionMatch ? 'match' : 'no-match'}`}>
                  <span className="label">Section:</span>
                  <span className="expected">Expected: {testResults.validation.expectedSection}</span>
                  <span className="actual">Actual: {testResults.validation.actualSection}</span>
                  <span className="result">{testResults.validation.sectionMatch ? '✅ Match' : '❌ Different'}</span>
                </div>
              )}
              
              {testResults.validation.expectedBias && (
                <div className={`validation-item ${testResults.validation.biasMatch ? 'match' : 'no-match'}`}>
                  <span className="label">Bias:</span>
                  <span className="expected">Expected: {testResults.validation.expectedBias}</span>
                  <span className="actual">Actual: {testResults.validation.actualBias}</span>
                  <span className="result">{testResults.validation.biasMatch ? '✅ Match' : '❌ Different'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="detailed-breakdown">
            <h4>📈 Detailed Analysis</h4>
            <div className="breakdown-grid">
              <div className="breakdown-item">
                <span className="label">Campaign Type:</span>
                <span className="value">{testResults.gannAnalysis.campaignType?.toUpperCase()}</span>
              </div>
              <div className="breakdown-item">
                <span className="label">Current Section:</span>
                <span className="value">{testResults.gannAnalysis.currentSection}</span>
              </div>
              <div className="breakdown-item">
                <span className="label">Structural Bias:</span>
                <span className={`value bias-${testResults.gannAnalysis.structuralBias?.toLowerCase()}`}>
                  {testResults.gannAnalysis.structuralBias}
                </span>
              </div>
              <div className="breakdown-item">
                <span className="label">Pattern Confidence:</span>
                <span className="value">{testResults.gannAnalysis.patternConfidence}%</span>
              </div>
              <div className="breakdown-item">
                <span className="label">Reversal Probability:</span>
                <span className="value">{testResults.gannAnalysis.reversalProbability}%</span>
              </div>
              <div className="breakdown-item">
                <span className="label">Volume Confirmation:</span>
                <span className={`value ${testResults.gannAnalysis.volumeConfirmation ? 'confirmed' : 'unconfirmed'}`}>
                  {testResults.gannAnalysis.volumeConfirmation ? '✅ Confirmed' : '❌ Unconfirmed'}
                </span>
              </div>
            </div>
          </div>

          {/* Key Levels */}
          <div className="key-levels">
            <h4>🎯 Key Gann Levels</h4>
            <div className="levels-grid">
              <div className="level-item">
                <span className="label">50% Retracement:</span>
                <span className="value">${testResults.detailedBreakdown.keyLevels['50%']?.toFixed(2)}</span>
              </div>
              <div className="level-item">
                <span className="label">Current Price:</span>
                <span className="value">${testResults.detailedBreakdown.keyLevels.Current?.toFixed(2)}</span>
              </div>
              <div className="level-item">
                <span className="label">All-Time High:</span>
                <span className="value">${testResults.detailedBreakdown.keyLevels.ATH?.toFixed(2)}</span>
              </div>
              <div className="level-item">
                <span className="label">All-Time Low:</span>
                <span className="value">${testResults.detailedBreakdown.keyLevels.ATL?.toFixed(2)}</span>
              </div>
              <div className="level-item">
                <span className="label">Price Position:</span>
                <span className="value">{testResults.detailedBreakdown.currentPricePosition} of range</span>
              </div>
            </div>
          </div>

          {/* Next Expected Move */}
          {testResults.gannAnalysis.nextExpectedMove && (
            <div className="next-move">
              <h4>📮 Next Expected Move</h4>
              <p className="move-description">{testResults.gannAnalysis.nextExpectedMove}</p>
            </div>
          )}

          {/* Volume Analysis */}
          {testResults.gannAnalysis.gannVolumeRules && testResults.gannAnalysis.gannVolumeRules.length > 0 && (
            <div className="volume-analysis">
              <h4>📊 Volume Analysis</h4>
              <ul className="volume-rules">
                {testResults.gannAnalysis.gannVolumeRules.map((rule, index) => (
                  <li key={index}>{rule}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GannTester;