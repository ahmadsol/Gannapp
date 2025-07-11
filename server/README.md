# 🧠 Gann Campaign Analyzer - Backend API

Professional trading system backend implementing W.D. Gann's mathematical methodology for cryptocurrency analysis.

## 🚀 Quick Start

```bash
npm install
npm start
```

## 📊 Features

- **Live Price Integration** - Real-time cryptocurrency data via CoinGecko API
- **Gann Mathematical Engine** - 851 lines of pure Gann calculations  
- **4-Section Campaign Analysis** - Bull (1→2→3→4) and Bear (A→a→b→B→c→C) patterns
- **Volume Analysis** - Section-specific confirmation rules
- **Multi-timeframe Support** - Monthly to 1-minute analysis
- **9 API Endpoints** - Comprehensive trading analysis

## 🔧 API Endpoints

- `GET /api/campaignstructure` - Multi-crypto campaign analysis
- `GET /api/liveprice` - Real-time prices + ATH/ATL
- `GET /api/retracements` - Gann retracement levels
- `GET /api/timeframe-opportunities/:asset/:timeframe` - Specific analysis
- `GET /api/multitimeframe/:asset` - Cross-timeframe alignment
- And 4 more...

## 🌐 Environment Variables

```bash
NODE_ENV=production
PORT=5000
```

## 📱 Frontend

This backend pairs with the React frontend for a complete trading interface.

## 🎯 W.D. Gann Methodology

Implements complete Gann trading methodology including:
- 4-section campaign structure
- Retracement levels (25%, 37.5%, 50%, 62.5%, 75%)
- Time cycle calculations
- Volume confirmation analysis

Built for professional cryptocurrency trading analysis.