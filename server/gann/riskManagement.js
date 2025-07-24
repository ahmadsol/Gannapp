// Risk Management
// Placeholder: implement capital allocation, stop-loss, loss streak logic


/**
 * Gann risk management: 1/10 capital risk, stop-loss, loss streak tracking.
 * @param {Array} tradeHistory - Array of trade objects: [{entry, exit, result, priceDataAtEntry}]
 * @param {number} capital - Current capital
 * @returns {Object} { allowedRisk, stopLoss, lossStreak, pauseTrading, details }
 */
function manageRisk(tradeHistory, capital) {
  // 1. Allowed risk per trade
  const allowedRisk = capital / 10;

  // 2. Suggest stop-loss based on last trade's price swings (e.g., below last swing low for long, above last swing high for short)
  let stopLoss = null;
  if (tradeHistory.length) {
    const lastTrade = tradeHistory[tradeHistory.length - 1];
    if (lastTrade.priceDataAtEntry) {
      const closes = lastTrade.priceDataAtEntry.map(p => p.close);
      const highs = lastTrade.priceDataAtEntry.map(p => p.high);
      const lows = lastTrade.priceDataAtEntry.map(p => p.low);
      const entryPrice = lastTrade.entry;
      if (lastTrade.direction === 'long') {
        // Stop below recent swing low
        const minLow = Math.min(...lows.slice(-5));
        stopLoss = minLow;
      } else if (lastTrade.direction === 'short') {
        // Stop above recent swing high
        const maxHigh = Math.max(...highs.slice(-5));
        stopLoss = maxHigh;
      }
    }
  }

  // 3. Track loss streaks
  let lossStreak = 0;
  for (let i = tradeHistory.length - 1; i >= 0; i--) {
    if (tradeHistory[i].result < 0) lossStreak++;
    else break;
  }
  const pauseTrading = lossStreak >= 3;

  const details = {
    allowedRisk,
    stopLoss,
    lossStreak,
    pauseTrading
  };

  return {
    allowedRisk,
    stopLoss,
    lossStreak,
    pauseTrading,
    details
  };
}

module.exports = { manageRisk };
