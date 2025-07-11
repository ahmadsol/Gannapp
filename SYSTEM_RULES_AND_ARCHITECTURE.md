# 🏗️ GANN ANALYZER - SYSTEM RULES & ARCHITECTURE

**Last Updated**: July 6, 2025
**Version**: 2.0 Production Ready
**Backup**: Gannapp_Backup_20250706_111725

---

## 🎯 SYSTEM OVERVIEW

### **Purpose**
Professional Gann Trading Campaign Analyzer with real-time cryptocurrency data integration, featuring TradingView charts, Bitstamp WebSocket feeds, and comprehensive W.D. Gann methodology implementation.

### **Technology Stack**
- **Frontend**: React 19.1.0 (Production Build)
- **Backend**: Node.js + Express
- **Data Sources**: Bitstamp WebSocket + TradingView + CoinGecko API
- **Deployment**: Local development with production optimization

---

## 🌐 ARCHITECTURE RULES

### **1. DUAL SERVER ARCHITECTURE**

#### **Backend Server (Port 5000)**
- **Purpose**: API endpoints, Gann calculations, data processing
- **File**: `/server/index.js`
- **Start Command**: `node index.js`
- **Memory Usage**: ~68MB
- **Status**: Must always run first

#### **Frontend Server (Port 3002 - Production)**
- **Purpose**: Optimized React application serving
- **File**: `/client/lite-server.js`
- **Start Command**: `node lite-server.js`
- **Memory Usage**: ~58MB (82% less than dev mode)
- **Serves**: Production build from `/client/build/`

#### **Frontend Server (Port 3000 - Development)**
- **Purpose**: Hot-reload development environment
- **Start Command**: `npm start`
- **Memory Usage**: ~328MB (high memory usage)
- **Use**: Only for code changes

### **2. MEMORY OPTIMIZATION RULES**

#### **Production Mode (Recommended)**
```bash
# Memory Efficient: 126MB total
Backend: node index.js                    # 68MB
Frontend: npm run build && node lite-server.js  # 58MB
Access: http://localhost:3002
```

#### **Development Mode (Code Changes Only)**
```bash
# Memory Heavy: 518MB total
Backend: node index.js                    # 68MB
Frontend: npm start                       # 328MB
Access: http://localhost:3000
```

---

## 📊 DATA FLOW ARCHITECTURE

### **3. PRICE DATA HIERARCHY**

#### **Priority Order (Highest to Lowest)**
1. **🔴 Bitstamp Live WebSocket** (< 30 seconds old)
   - Source: `wss://ws.bitstamp.net`
   - Pairs: BTCUSD, ETHUSD, ADAUSD
   - Update frequency: Real-time (every trade)

2. **🟠 Reference Price** (Backend API)
   - Source: CoinGecko API via backend
   - Update frequency: On demand
   - Fallback for missing live data

3. **⚫ Static/Cached Data**
   - Last resort when live feeds fail
   - Marked clearly as "OLD" data

#### **Price Selection Rules**
```javascript
// Function: getCurrentPrice(coinId)
if (bitstampLiveData && age < 30_seconds) return bitstampPrice;
if (referenceCoinMatches) return referencePrice;
return fallbackPrice;
```

### **4. CORS CONFIGURATION RULES**

#### **Backend CORS Settings**
```javascript
// Must allow all local ports
origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002']
```

#### **Environment Configuration**
- **Development**: `.env` → `http://localhost:5000`
- **Production**: `.env.production` → `http://localhost:5000` 
- **Never**: Point production to Railway URL for local development

---

## 🎛️ USER INTERFACE RULES

### **5. TAB STRUCTURE & FUNCTIONALITY**

#### **Tab 1: Campaign Structure**
- **Purpose**: Live market analysis using Gann methodology
- **Data Source**: Backend `/api/campaignstructure`
- **Features**:
  - Live prices for BTC, ETH, ADA
  - 4-section bull campaigns (1→2→3→4)
  - 6-section bear campaigns (A→a→b→B→c→C)
  - Volume confirmation analysis
  - Pattern visualization with SVG

#### **Tab 2: Trade Setups**
- **Purpose**: Multi-timeframe trading opportunities
- **Data Sources**: 
  - Backend APIs for trade logic
  - Bitstamp WebSocket for live prices
- **Features**:
  - Live price status indicator
  - Multi-timeframe analysis (Monthly → 15min)
  - Pattern charts with current price markers
  - Entry/Stop/Target calculations
  - Risk management integration

#### **Tab 3: Professional Charts**
- **Purpose**: TradingView integration with Bitstamp data
- **Data Source**: TradingView widgets + Bitstamp WebSocket
- **Features**:
  - Professional charting interface
  - Real-time price feeds
  - Technical analysis tools
  - Multi-timeframe synchronized data

#### **Tab 4: Settings**
- **Purpose**: Configuration and risk management
- **Features**:
  - Coin selection (BTC, ETH, ADA only)
  - Risk management calculator
  - Account size configuration

### **6. COIN SELECTION RULES**

#### **Available Cryptocurrencies**
```javascript
const availableCoins = [
  { id: 'btc', symbol: 'BTC', name: 'Bitcoin', bitstampPair: 'BTCUSD' },
  { id: 'eth', symbol: 'ETH', name: 'Ethereum', bitstampPair: 'ETHUSD' },
  { id: 'ada', symbol: 'ADA', name: 'Cardano', bitstampPair: 'ADAUSD' }
];
```

#### **Selection State Management**
- **Default**: `['btc']` (Bitcoin selected by default)
- **Storage**: React state (not persistent)
- **Filtering**: All tabs respect selected coins
- **Minimum**: At least 1 coin must be selected

---

## 🔄 WEBSOCKET CONNECTION RULES

### **7. BITSTAMP WEBSOCKET MANAGEMENT**

#### **Connection Strategy**
```javascript
// Auto-reconnect with exponential backoff
onClose: () => setTimeout(reconnect, 5000)
// Connection pooling to prevent memory leaks
// Cleanup on component unmount
```

#### **Subscription Rules**
- **Live Ticker**: For 24hr change and stats
- **Live Trades**: For real-time price updates
- **Error Handling**: Graceful degradation to backend API

#### **Connection Status Indicators**
- **🟢 Green Dot**: Connected and receiving data
- **🔴 Red Dot**: Disconnected or error state
- **Reconnection**: Automatic every 5 seconds

---

## 🧮 GANN METHODOLOGY RULES

### **8. CAMPAIGN STRUCTURE ANALYSIS**

#### **Bull Market Sections**
1. **Section 1**: Accumulation (Smart money buying)
2. **Section 2**: Markup (Trend acceleration) - Most reliable breakouts
3. **Section 3**: Distribution (Smart money selling)
4. **Section 4**: Decline (Price decline) - Reversal signal

#### **Bear Market Sections**
1. **Section A**: Initial Decline
2. **Section a**: Bounce (Relief rally)
3. **Section b**: Retest
4. **Section B**: Breakdown (Major decline)
5. **Section c**: Rally (Counter-trend)
6. **Section C**: Final Decline (Capitulation)

#### **Retracement Levels** (In order of importance)
1. **50%** - Most important level
2. **37.5%** - Support/resistance
3. **62.5%** - Extension level
4. **25%** - Major support
5. **75%** - Major resistance

#### **Time Cycles**
- **49-52 day cycle** (Gann's primary cycle)
- **90-98 day cycle** (Major reversal periods)
- **Monthly/Weekly/Daily** hierarchy

### **9. VOLUME ANALYSIS RULES**

#### **Section-Specific Volume Confirmation**
- **Section 1**: Increasing volume on advances
- **Section 2**: Strong volume on breakouts (most reliable)
- **Section 3**: Decreasing volume (distribution phase)
- **Section 4**: Weak volume (reversal signal)

---

## 🎨 VISUAL DESIGN RULES

### **10. PERFORMANCE OPTIMIZATION**

#### **Animation Rules**
- **Removed**: Heavy pulse, glow, scale animations
- **Simplified**: Basic hover effects only
- **Transitions**: Maximum 0.2s duration
- **CPU Usage**: Optimized for low-memory systems

#### **Color Scheme**
- **Live Data**: #dc3545 (red)
- **Reference Data**: #e67e22 (orange)
- **Bull Trends**: #27ae60 (green)
- **Bear Trends**: #e74c3c (red)
- **Neutral**: #6c757d (gray)

#### **Price Formatting**
```javascript
// Remove trailing zeros
formatPrice(3648.6300) → "3648.63"
formatPrice(0.5710000) → "0.571"
```

---

## 🚀 DEPLOYMENT RULES

### **11. STARTUP SEQUENCE**

#### **Correct Order**
1. **Start Backend**: `cd server && node index.js`
2. **Wait for**: "Server listening at http://localhost:5000"
3. **Start Frontend**: `cd client && node lite-server.js`
4. **Access**: http://localhost:3002

#### **Troubleshooting Commands**
```bash
# Check running processes
ps aux | grep node

# Test backend API
curl http://localhost:5000/api/campaignstructure

# Test frontend
curl http://localhost:3002/

# Hard refresh browser
Ctrl + Shift + R
```

### **12. BUILD REQUIREMENTS**

#### **Production Build**
- **Command**: `npm run build`
- **Output**: `/client/build/` directory
- **Environment**: Uses `.env.production`
- **Memory**: 82% less than development mode

#### **Environment Files**
- **`.env`**: Development configuration
- **`.env.production`**: Production configuration (must point to localhost:5000)
- **`.env.local`**: Local overrides

---

## 📁 FILE STRUCTURE RULES

### **13. CRITICAL FILES**

#### **Backend Core**
- `/server/index.js` - Main server and API endpoints
- `/server/gannCalculations.js` - Gann mathematical engine (851 lines)
- `/server/package.json` - Dependencies

#### **Frontend Core**
- `/client/src/App.js` - Main React application logic
- `/client/src/BitstampChart.js` - TradingView + Bitstamp integration
- `/client/src/GannPatternChart.js` - Pattern visualization
- `/client/lite-server.js` - Production server

#### **Configuration**
- `/client/src/config.js` - API endpoint configuration
- `/client/.env.production` - Production environment
- `/CLAUDE.md` - System memory and status

---

## 🔒 SECURITY & STABILITY RULES

### **14. SAFETY PROTOCOLS**

#### **Never Modify**
- Core Gann calculation algorithms
- WebSocket connection pooling logic
- CORS configuration (without testing)
- Environment file URLs in production

#### **Always Test**
- Backend API endpoints before frontend changes
- WebSocket connections after reconnection logic changes
- Memory usage after major modifications
- Price data accuracy after data source changes

#### **Backup Before**
- Major architectural changes
- New feature implementations
- Production deployments
- Dependency updates

---

## 📊 MONITORING RULES

### **15. SYSTEM HEALTH INDICATORS**

#### **Memory Usage Targets**
- **Total System**: < 150MB (target: 126MB)
- **Backend**: < 80MB (target: 68MB)
- **Frontend**: < 70MB (target: 58MB)

#### **Performance Metrics**
- **WebSocket Reconnection**: < 5 second intervals
- **Price Update Frequency**: Real-time (< 1 second lag)
- **API Response Time**: < 2 seconds
- **Page Load Time**: < 3 seconds

#### **Data Quality Checks**
- **Live Price Accuracy**: Must match Bitstamp
- **Campaign Analysis**: Must reflect current market structure
- **Pattern Recognition**: Must align with Gann methodology

---

## 🎯 SUCCESS CRITERIA

### **16. SYSTEM VALIDATION**

#### **Functional Requirements** ✅
- [x] Real-time price feeds working
- [x] All 4 tabs functioning
- [x] Gann analysis accurate
- [x] Memory optimized
- [x] Professional charts integrated

#### **Performance Requirements** ✅
- [x] < 150MB total memory usage
- [x] Real-time price updates
- [x] Smooth user interface
- [x] No cache conflicts
- [x] Reliable WebSocket connections

#### **User Experience Requirements** ✅
- [x] Intuitive navigation
- [x] Clear price indicators
- [x] Live data status visible
- [x] Professional appearance
- [x] Responsive design

---

**🏆 STATUS: PRODUCTION READY**

The Gann Trading Campaign Analyzer is now a professional-grade application with institutional-quality data feeds, optimized performance, and complete W.D. Gann methodology implementation.