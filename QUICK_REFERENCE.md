# 🚀 GANN ANALYZER - QUICK REFERENCE CARD

## ⚡ STARTUP COMMANDS

### Production Mode (Recommended - 126MB total)
```bash
# Terminal 1: Backend
cd /mnt/c/Users/ahmad/OneDrive/Desktop/Gannapp/server && node index.js

# Terminal 2: Frontend  
cd /mnt/c/Users/ahmad/OneDrive/Desktop/Gannapp/client && node lite-server.js

# Access: http://localhost:3002
```

### Development Mode (Code changes only - 518MB total)
```bash
# Terminal 1: Backend
cd /mnt/c/Users/ahmad/OneDrive/Desktop/Gannapp/server && node index.js

# Terminal 2: Frontend
cd /mnt/c/Users/ahmad/OneDrive/Desktop/Gannapp/client && npm start

# Access: http://localhost:3000
```

## 🔧 TROUBLESHOOTING

### Backend not responding
```bash
curl http://localhost:5000/api/campaignstructure
ps aux | grep "node index.js"
```

### Frontend cache issues
```bash
# Hard refresh: Ctrl + Shift + R
# Incognito mode: Ctrl + Shift + N
# Rebuild: npm run build
```

### Memory issues
```bash
free -h  # Check system memory
ps aux --sort=-%mem | head -5  # Top memory users
```

## 📊 PRICE INDICATORS

- **🔴 Red Dot**: Live Bitstamp data (< 30s old)
- **🟠 Orange Dot**: Reference API data  
- **⚫ Gray**: Old/cached data
- **Timestamps**: "15s ago" = data freshness

## 🎯 SYSTEM STATUS

### Current Metrics ✅
- **Memory**: 126MB total (76% reduction)
- **Backend**: 68MB on port 5000
- **Frontend**: 58MB on port 3002
- **Data**: Real-time WebSocket from Bitstamp

### Architecture ✅
- **4 Tabs**: Campaign, Trade Setups, Charts, Settings
- **3 Data Sources**: Bitstamp, TradingView, CoinGecko
- **3 Cryptos**: BTC, ETH, ADA
- **851 Lines**: Gann calculation engine

## 🔄 BACKUP INFO

- **Latest**: `Gannapp_Backup_20250706_111725`
- **Location**: `/mnt/c/Users/ahmad/OneDrive/Desktop/`
- **Status**: Production Ready v2.0

## 📋 FILES TO NEVER MODIFY

- `/server/gannCalculations.js` (Core Gann engine)
- `/client/.env.production` (Must point to localhost:5000)
- `/server/index.js` CORS settings
- `/client/lite-server.js` (Production server)

## 🎯 NEXT ENHANCEMENT READY

System is ready for additional enhancements:
- More cryptocurrencies
- Additional timeframes  
- Advanced Gann tools
- Cloud deployment