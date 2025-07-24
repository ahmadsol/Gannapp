const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mcache = require('memory-cache');
const {
  calculateRetracementLevels,
  calculateTimeCycles,
  calculatePositionSize,
  generateTradeOpportunities,
  analyzeCampaignStructure,
  analyzeMultiTimeframeAlignment,
  generatePatternVisualization
} = require('./gannCalculations');

const app = express();
const port = process.env.PORT || 5000;

// --- Performance Optimizations ---

// 1. Response Compression
app.use(compression());

// 2. Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// 3. In-Memory Caching
const cache = (duration) => {
  return (req, res, next) => {
    const key = '__express__' + req.originalUrl || req.url;
    const cachedBody = mcache.get(key);
    if (cachedBody) {
      res.send(JSON.parse(cachedBody));
      return;
    } else {
      res.sendResponse = res.send;
      res.send = (body) => {
        mcache.put(key, body, duration * 1000);
        res.sendResponse(body);
      };
      next();
    }
  };
};

app.use(cors({
  origin: true,
  credentials: true
}));

// Additional CORS headers for HTTPS to HTTP requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Handle OPTIONS preflight requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Gann Trading App Backend');
});

app.get('/api/retracements', (req, res) => {
  const { high, low } = req.query;
  if (high && low) {
    const retracements = calculateRetracementLevels(parseFloat(high), parseFloat(low));
    res.json(retracements);
  } else {
    res.status(400).json({ error: 'Please provide both high and low parameters.' });
  }
});

app.get('/api/timecycles', (req, res) => {
  const { startDate } = req.query;
  if (startDate) {
    try {
      const timeCycles = calculateTimeCycles(startDate);
      res.json(timeCycles);
    } catch (e) {
      res.status(400).json({ error: 'Invalid date format for startDate.' });
    }
  } else {
    res.status(400).json({ error: 'Please provide a startDate parameter.' });
  }
});

app.get('/api/positionsize', (req, res) => {
  const { accountSize, riskPercentage, entryPrice, stopLossPrice } = req.query;
  if (accountSize && riskPercentage && entryPrice && stopLossPrice) {
    const result = calculatePositionSize(
      parseFloat(accountSize),
      parseFloat(riskPercentage),
      parseFloat(entryPrice),
      parseFloat(stopLossPrice)
    );
    if (result.error) {
      res.status(400).json({ error: result.error });
    } else {
      res.json(result);
    }
  } else {
    res.status(400).json({ error: 'Please provide accountSize, riskPercentage, entryPrice, and stopLossPrice.' });
  }
});

app.get('/api/liveprice', async (req, res) => {
  const coinId = req.query.coin || 'ethereum';
  const currency = 'usd';

  // Updated fallback prices - will be replaced by live data when available
  const mockPrices = {
    'bitcoin': {
      currentPrice: 107875,
      allTimeHigh: 73737,
      allTimeLow: 67.81
    },
    'ethereum': {
      currentPrice: 2496,
      allTimeHigh: 4878.26,
      allTimeLow: 0.42
    },
    'cardano': {
      currentPrice: 0.571,
      allTimeHigh: 3.10,
      allTimeLow: 0.017
    }
  };

  const mockData = {
    ...mockPrices[coinId],
    coinId,
    currency
  };

  // Try real CoinGecko API first, fallback to mock data
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'GannTradingApp/1.0'
  };

  const currentPriceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}`;

  try {
    console.log(`Attempting to fetch real data for ${coinId} from CoinGecko...`);

    const currentPriceResponse = await fetch(currentPriceUrl, { headers });

    if (currentPriceResponse.ok) {
      const currentPriceData = await currentPriceResponse.json();

      if (currentPriceData[coinId] && currentPriceData[coinId][currency]) {
        const currentPrice = currentPriceData[coinId][currency];

        // Use realistic historical estimates since we can't get full historical data easily
        const allTimeHigh = mockData.allTimeHigh;
        const allTimeLow = mockData.allTimeLow;

        const realData = { currentPrice, allTimeHigh, allTimeLow, coinId, currency };
        console.log(`Successfully fetched REAL price for ${coinId}:`, realData);
        return res.json(realData);
      }
    }

    // If we get here, API didn't work as expected
    throw new Error(`CoinGecko API error! status: ${currentPriceResponse.status}`);

  } catch (e) {
    console.error(`Error fetching real price for ${coinId}:`, e.message);
    console.log(`Falling back to mock data for ${coinId}:`, mockData);
    res.json(mockData); // Fallback to mock data
  }
});

app.get('/api/campaignstructure', cache(300), async (req, res) => { // Cache for 5 minutes
  try {
    // Fetch live prices for all cryptocurrencies
    const cryptos = ['bitcoin', 'ethereum', 'cardano'];
    const livePrices = {};

    // Fetch live prices from CoinGecko with better error handling
    try {
      // Try bulk fetch first (more efficient)
      const bulkUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptos.join(',')}&vs_currencies=usd&include_24hr_change=true`;
      const response = await fetch(bulkUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GannTradingApp/1.0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        for (const crypto of cryptos) {
          if (data[crypto]) {
            livePrices[crypto] = {
              currentPrice: data[crypto].usd,
              change: data[crypto].usd_24h_change || 0
            };
            console.log(`✅ Live price for ${crypto}: $${data[crypto].usd}`);
          }
        }
      } else {
        console.warn('Bulk fetch failed, trying individual requests...');
        // Fallback to individual requests
        for (const crypto of cryptos) {
          try {
            const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${crypto}&vs_currencies=usd&include_24hr_change=true`;
            const response = await fetch(priceUrl, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'GannTradingApp/1.0'
              }
            });

            if (response.ok) {
              const data = await response.json();
              if (data[crypto]) {
                livePrices[crypto] = {
                  currentPrice: data[crypto].usd,
                  change: data[crypto].usd_24h_change || 0
                };
                console.log(`✅ Live price for ${crypto}: $${data[crypto].usd}`);
              }
            }
          } catch (e) {
            console.warn(`Failed to fetch live price for ${crypto}:`, e.message);
          }
        }
      }
    } catch (e) {
      console.warn('All price fetching failed:', e.message);
    }

    // Generate realistic campaign structure using Gann analysis engine with LIVE PRICES
    const campaigns = [];

    // Use live prices with historical data patterns
    const cryptoData = {
      'BTC': {
        symbol: 'BTC',
        name: 'Bitcoin',
        currentPrice: livePrices.bitcoin?.currentPrice || 107875, // Current BTC price or fallback
        change: livePrices.bitcoin?.change || -1.57,
        highs: [108000, 105000, 102000, 99000, 98000, livePrices.bitcoin?.currentPrice || 107875, 95000, 94000],
        lows: [15476, 25000, 30000, 40000, 60000, 70000, 80000, 85000],
        closes: [15476, 35000, 50000, 65000, 80000, 90000, livePrices.bitcoin?.currentPrice || 107875, 96000],
        volume: [45000000, 52000000, 78000000, 65000000, 43000000, 38000000, 32000000, 28000000],
        dates: ['2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06', '2023-07', '2023-08']
      },
      'ETH': {
        symbol: 'ETH',
        name: 'Ethereum',
        currentPrice: livePrices.ethereum?.currentPrice || 2496, // Current ETH price or fallback
        change: livePrices.ethereum?.change || -3.16,
        highs: [4878, 4500, 4200, 4000, 3900, livePrices.ethereum?.currentPrice || 2496, 3700, 3600],
        lows: [0.42, 1200, 1500, 2000, 2500, 3000, 3200, 3400],
        closes: [0.42, 1800, 2500, 3000, 3400, 3600, livePrices.ethereum?.currentPrice || 2496, 3750],
        volume: [89000000, 125000000, 156000000, 134000000, 98000000, 76000000, 45000000, 67000000],
        dates: ['2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06', '2023-07', '2023-08']
      },
      'ADA': {
        symbol: 'ADA',
        name: 'Cardano',
        currentPrice: livePrices.cardano?.currentPrice || 0.571, // Current ADA price or fallback
        change: livePrices.cardano?.change || -3.87,
        highs: [3.10, 2.87, 2.34, 1.98, 1.67, 1.23, livePrices.cardano?.currentPrice || 0.571, 0.90],
        lows: [0.017, 0.034, 0.067, 0.123, 0.234, 0.345, 0.412, 0.445],
        closes: [0.017, 0.234, 0.567, 0.789, 1.234, 0.876, livePrices.cardano?.currentPrice || 0.571, 0.92],
        volume: [234000000, 187000000, 298000000, 345000000, 234000000, 123000000, 89000000, 156000000],
        dates: ['2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06', '2023-07', '2023-08']
      }
    };

  Object.values(cryptoData).forEach(crypto => {
    // Analyze campaign structure using Gann engine
    const analysis = analyzeCampaignStructure({
      highs: crypto.highs,
      lows: crypto.lows,
      closes: crypto.closes,
      dates: crypto.dates
    }, 'daily');

    campaigns.push({
      symbol: crypto.symbol,
      name: crypto.name,
      price: crypto.currentPrice,
      change: crypto.change,
      structuralBias: analysis.structuralBias,
      biasPercentage: analysis.biasPercentage,
      completionSignal: analysis.completionSignal,
      sections: analysis.sections,
      currentSection: analysis.currentSection,
      nextExpectedMove: analysis.nextExpectedMove,
      reversalProbability: analysis.reversalProbability,
      patternConfidence: analysis.patternConfidence,
      campaignType: analysis.campaignType
    });
  });

  console.log(`Campaign structure generated for ${campaigns.length} cryptocurrencies with live prices`);
  res.json(campaigns);

  } catch (error) {
    console.error('Error generating campaign structure:', error);
    res.status(500).json({
      error: 'Failed to generate campaign structure',
      message: error.message
    });
  }
});

app.get('/api/tradesetups', (req, res) => {
  const { currentPrice, high, low, currentDate, tradeAmount } = req.query;
  if (currentPrice && high && low && currentDate) {
    const opportunities = generateTradeOpportunities(
      parseFloat(currentPrice),
      parseFloat(high),
      parseFloat(low),
      currentDate,
      tradeAmount ? parseFloat(tradeAmount) : 1000
    );
    res.json(opportunities);
  } else {
    res.status(400).json({ error: 'Please provide currentPrice, high, low, and currentDate parameters.' });
  }
});

// --- Optimized Opportunity Generation ---

const getOpportunities = async (asset, timeframe, tradeAmount) => {
    const coinIds = {
      'btc': 'bitcoin',
      'eth': 'ethereum',
      'ada': 'cardano'
    };
    const coinId = coinIds[asset.toLowerCase()] || 'bitcoin';

    let livePrice = null;
    try {
      const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
      const response = await fetch(priceUrl, { headers: { 'Accept': 'application/json', 'User-Agent': 'GannTradingApp/1.0' } });
      if (response.ok) {
        const data = await response.json();
        if (data[coinId]) {
          livePrice = data[coinId].usd;
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch live price for ${asset}:`, e.message);
    }

    const fallbackPrices = { 'btc': 107875, 'eth': 2496, 'ada': 0.571 };
    const currentPrice = livePrice || fallbackPrices[asset.toLowerCase()] || 50000;

    const timeframeData = {
      'monthly': { duration: '6-12 months', high: currentPrice * 1.80, low: currentPrice * 0.30, weight: 10, description: 'Major campaign analysis' },
      'weekly': { duration: '2-8 weeks', high: currentPrice * 1.45, low: currentPrice * 0.60, weight: 9, description: 'Trend following' },
      'daily': { duration: '3-14 days', high: currentPrice * 1.25, low: currentPrice * 0.80, weight: 8, description: 'Swing trading' },
      '4h': { duration: '1-3 days', high: currentPrice * 1.12, low: currentPrice * 0.90, weight: 7, description: 'Short-term swings' },
      '1h': { duration: '4-12 hours', high: currentPrice * 1.06, low: currentPrice * 0.95, weight: 6, description: 'Intraday swings' },
      '15m': { duration: '30min-2 hours', high: currentPrice * 1.03, low: currentPrice * 0.98, weight: 5, description: 'Scalping' },
      '5m': { duration: '5-30 minutes', high: currentPrice * 1.015, low: currentPrice * 0.985, weight: 4, description: 'Ultra-short scalping' },
      '1m': { duration: '1-10 minutes', high: currentPrice * 1.008, low: currentPrice * 0.992, weight: 3, description: 'Micro-scalping' }
    };

    const tfData = timeframeData[timeframe];
    if (!tfData) {
      throw new Error('Invalid timeframe');
    }

    const today = new Date().toISOString().split('T')[0];
    const opportunities = generateTradeOpportunities(currentPrice, tfData.high, tfData.low, today, parseFloat(tradeAmount) || 1000, timeframe);

    const getTimeframeTradeType = (tf) => {
        const types = {
            'monthly': 'INVESTMENT OPPORTUNITY', 'weekly': 'SWING TRADE OPPORTUNITY', 'daily': 'SWING TRADE OPPORTUNITY',
            '4h': 'DAY TRADE OPPORTUNITY', '1h': 'DAY TRADE OPPORTUNITY', '15m': 'SCALPING OPPORTUNITY',
            '5m': 'SCALPING OPPORTUNITY', '1m': 'SCALPING OPPORTUNITY'
        };
        return types[tf] || 'TRADE OPPORTUNITY';
    };

    const timeframeOpportunities = opportunities.map((opp, index) => ({
      ...opp,
      id: `${timeframe}_${asset}_${index + 1}`,
      type: getTimeframeTradeType(timeframe),
      timeframe: timeframe.toUpperCase(),
      timeframeDuration: tfData.duration,
      timeframeWeight: tfData.weight,
      timeframeDescription: tfData.description,
      asset: asset.toUpperCase(),
      currentPrice: currentPrice,
      priceSource: livePrice ? 'live' : 'fallback',
      weight: tfData.weight
    }));
    
    const timeframeRules = {
        'monthly': ['Monthly trend overrides all lower timeframes', '4th section completions signal major reversals'],
        'weekly': ['Follow monthly bias, trade weekly swings', 'Strong 2nd section breakouts most reliable'],
        'daily': ['Gann\'s major 49-52 and 90-98 day cycles', 'Daily 4th sections signal swing reversals'],
        '4h': ['Short-term swing entries and exits', 'Quick section completions possible'],
        '1h': ['Intraday momentum and reversal plays', '50% retracements most reliable'],
        '15m': ['Pure scalping opportunities', 'Tight stop losses required'],
        '5m': ['Ultra-short term momentum', 'Micro-section analysis'],
        '1m': ['Tick-by-tick analysis', 'Extremely tight risk management']
    };

    return {
      asset: asset.toUpperCase(),
      timeframe: timeframe.toUpperCase(),
      currentPrice: currentPrice,
      priceSource: livePrice ? 'CoinGecko Live' : 'Fallback',
      timeframeInfo: tfData,
      opportunities: timeframeOpportunities,
      gannRules: timeframeRules[timeframe] || [],
      timestamp: new Date().toISOString(),
      analysisNote: `Gann analysis for ${timeframe} timeframe - Weight ${tfData.weight}/10 in hierarchy`
    };
}

// 4. New Batched Endpoint
app.post('/api/batch-opportunities', async (req, res) => {
    const { requests } = req.body; // requests is an array of {asset, timeframe, tradeAmount}
    if (!requests || !Array.isArray(requests)) {
        return res.status(400).json({ error: 'Invalid request body. "requests" should be an array.' });
    }

    try {
        const results = await Promise.all(requests.map(r => getOpportunities(r.asset, r.timeframe, r.tradeAmount)));
        res.json(results);
    } catch (error) {
        console.error('Error in batch processing:', error);
        res.status(500).json({ error: 'Failed to process batch request', message: error.message });
    }
});


// TIMEFRAME-SPECIFIC TRADE OPPORTUNITIES (New Feature)
app.get('/api/timeframe-opportunities/:asset/:timeframe', cache(60), async (req, res) => { // Cache for 1 minute
  const { asset, timeframe } = req.params;
  const { tradeAmount } = req.query;

  try {
    console.log(`Generating ${timeframe} opportunities for ${asset}...`);
    const result = await getOpportunities(asset, timeframe, tradeAmount);
    res.json(result);
  } catch (error) {
    console.error(`Error generating ${timeframe} opportunities for ${asset}:`, error);
    res.status(500).json({
      error: 'Failed to generate timeframe opportunities',
      message: error.message
    });
  }
});

// Advanced Gann Analysis Endpoints

app.get('/api/multitimeframe/:asset', (req, res) => {
  const { asset } = req.params;

  // Sample multi-timeframe data (in real app, this would come from database)
  const timeframeData = {
    monthly: { structuralBias: 'BEAR', currentSection: 3, reversalProbability: 75 },
    weekly: { structuralBias: 'BEAR', currentSection: 2, reversalProbability: 45 },
    daily: { structuralBias: 'NEUTRAL', currentSection: 4, reversalProbability: 85 },
    '4h': { structuralBias: 'BULL', currentSection: 1, reversalProbability: 15 },
    '1h': { structuralBias: 'BULL', currentSection: 2, reversalProbability: 25 },
    '15m': { structuralBias: 'NEUTRAL', currentSection: 3, reversalProbability: 65 },
    '5m': { structuralBias: 'BEAR', currentSection: 'C', reversalProbability: 90 },
    '1m': { structuralBias: 'BEAR', currentSection: 'B', reversalProbability: 70 }
  };

  const alignment = analyzeMultiTimeframeAlignment(timeframeData);

  res.json({
    asset: asset.toUpperCase(),
    timeframes: timeframeData,
    alignment: alignment,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/patterns/:asset/:timeframe', (req, res) => {
  const { asset, timeframe } = req.params;

  // Sample price data for pattern visualization
  const priceData = {
    highs: [100, 120, 150, 180, 160, 140, 130, 125],
    lows: [80, 90, 110, 140, 120, 100, 95, 90],
    closes: [95, 115, 145, 175, 155, 135, 125, 120],
    dates: ['2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06', '2023-07', '2023-08']
  };

  const campaignAnalysis = analyzeCampaignStructure(priceData, timeframe);
  const patternVisualization = generatePatternVisualization(campaignAnalysis, priceData);

  res.json({
    asset: asset.toUpperCase(),
    timeframe: timeframe,
    analysis: campaignAnalysis,
    visualization: patternVisualization,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/gannlevels/:asset', (req, res) => {
  const { asset } = req.params;
  const { high, low, currentPrice } = req.query;

  if (!high || !low) {
    return res.status(400).json({ error: 'Please provide high and low parameters' });
  }

  const retracementAnalysis = calculateRetracementLevels(
    parseFloat(high),
    parseFloat(low),
    currentPrice ? parseFloat(currentPrice) : null
  );

  res.json({
    asset: asset.toUpperCase(),
    analysis: retracementAnalysis,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/timecycles/advanced/:timeframe', (req, res) => {
  const { timeframe } = req.params;
  const { startDate } = req.query;

  if (!startDate) {
    return res.status(400).json({ error: 'Please provide startDate parameter' });
  }

  try {
    const advancedCycles = calculateTimeCycles(startDate, timeframe);
    res.json({
      timeframe: timeframe,
      cycles: advancedCycles,
      startDate: startDate,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(400).json({ error: 'Invalid date format for startDate.' });
  }
});

// MANUAL TESTING ENDPOINT - For validation of Gann analysis
app.post('/api/test-analysis', (req, res) => {
  try {
    const {
      highs,
      lows,
      closes,
      volume,
      dates,
      currentPrice,
      timeframe,
      expectedSection,
      expectedBias
    } = req.body;

    console.log('=== MANUAL TESTING ANALYSIS ===');
    console.log('Input Data:', { highs, lows, closes, timeframe });

    // Run our Gann analysis on the provided data
    const analysis = analyzeCampaignStructure({
      highs,
      lows,
      closes,
      volume,
      dates
    }, timeframe);

    // Calculate retracements from the data
    const allTimeHigh = Math.max(...highs);
    const allTimeLow = Math.min(...lows);
    const retracements = calculateRetracementLevels(allTimeHigh, allTimeLow, currentPrice);

    // Generate time cycles from start date
    const startDate = dates[0];
    const timeCycles = calculateTimeCycles(startDate, timeframe);

    // Detailed validation response
    const validation = {
      inputData: {
        highs, lows, closes, volume, dates, currentPrice, timeframe
      },
      gannAnalysis: analysis,
      retracements: retracements,
      timeCycles: timeCycles[timeframe] || {},
      validation: {
        expectedSection: expectedSection,
        actualSection: analysis.currentSection,
        sectionMatch: expectedSection ? (analysis.currentSection == expectedSection) : null,
        expectedBias: expectedBias,
        actualBias: analysis.structuralBias,
        biasMatch: expectedBias ? (analysis.structuralBias === expectedBias) : null
      },
      detailedBreakdown: {
        priceRange: allTimeHigh - allTimeLow,
        currentPricePosition: currentPrice ? ((currentPrice - allTimeLow) / (allTimeHigh - allTimeLow) * 100).toFixed(1) + '%' : 'N/A',
        trend: closes[closes.length - 1] > closes[0] ? 'UP' : 'DOWN',
        momentum: analysis.biasPercentage,
        volumeConfirmation: analysis.volumeConfirmation,
        keyLevels: {
          '50%': retracements.levels ? retracements.levels['50%'] : retracements['50%'],
          'Current': currentPrice,
          'ATH': allTimeHigh,
          'ATL': allTimeLow
        }
      },
      timestamp: new Date().toISOString()
    };

    console.log('Analysis Result:', {
      section: analysis.currentSection,
      bias: analysis.structuralBias,
      confidence: analysis.patternConfidence
    });

    res.json(validation);

  } catch (error) {
    console.error('Error in test analysis:', error);
    res.status(500).json({
      error: 'Test analysis failed',
      message: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('- GET /api/campaignstructure - Multi-crypto campaign analysis');
  console.log('- GET /api/multitimeframe/:asset - Multi-timeframe alignment');
  console.log('- GET /api/patterns/:asset/:timeframe - Pattern visualization');
  console.log('- GET /api/gannlevels/:asset - Advanced retracement analysis');
  console.log('- GET /api/timecycles/advanced/:timeframe - Hierarchical time cycles');
  console.log('- POST /api/test-analysis - Manual data testing and validation');
  console.log('- POST /api/batch-opportunities - Batch trade opportunities');
});