// Time and Cycle Forecasting
// Placeholder: implement Gann cycle logic (7, 30, 45, 90, 120, 180, etc.)


/**
 * Forecasts Gann cycles (7, 30, 45, 90, 120, 180, etc.) from last top/bottom, fractal for all timeframes.
 * @param {Array} priceData - Array of price objects: [{open, high, low, close, time}, ...]
 * @param {Object} [options] - { timeframe: 'monthly'|'weekly'|'daily'|'intraday', cycleLengths: [int,...] }
 * @returns {Object} { cycles: [{length, fromIndex, toIndex, type}], signals: [string] }
 */
function forecastCycles(priceData, options = {}) {
  // Default Gann cycles (in bars, proportional to timeframe)
  const defaultCycles = [7, 30, 45, 90, 120, 180];
  const cyclesToCheck = options.cycleLengths || defaultCycles;
  const closes = priceData.map(p => p.close);
  // Find swing highs/lows (reuse logic)
  function findSwings(data, lookback=3) {
    let highs = [], lows = [];
    for (let i = lookback; i < data.length - lookback; i++) {
      let isHigh = true, isLow = true;
      for (let j = 1; j <= lookback; j++) {
        if (data[i] <= data[i-j] || data[i] <= data[i+j]) isHigh = false;
        if (data[i] >= data[i-j] || data[i] >= data[i+j]) isLow = false;
      }
      if (isHigh) highs.push(i);
      if (isLow) lows.push(i);
    }
    return {highs, lows};
  }
  const swings = findSwings(closes);

  // Use the most recent swing (top or bottom) as the cycle anchor
  let lastSwingIndex = null, lastSwingType = null;
  if (swings.highs.length && swings.lows.length) {
    const lastHigh = swings.highs[swings.highs.length-1];
    const lastLow = swings.lows[swings.lows.length-1];
    if (lastHigh > lastLow) {
      lastSwingIndex = lastHigh;
      lastSwingType = 'top';
    } else {
      lastSwingIndex = lastLow;
      lastSwingType = 'bottom';
    }
  }

  // For each cycle, check if we are near a cycle window from the last swing
  let cycles = [], signals = [];
  if (lastSwingIndex !== null) {
    const barsSinceSwing = closes.length - 1 - lastSwingIndex;
    cyclesToCheck.forEach(len => {
      // Fractal: cycles apply to any timeframe, so len is in bars of current timeframe
      if (barsSinceSwing === len || barsSinceSwing === len - 1 || barsSinceSwing === len + 1) {
        signals.push(`Cycle window (${len} bars) from last ${lastSwingType}`);
      }
      cycles.push({length: len, fromIndex: lastSwingIndex, toIndex: closes.length-1, type: lastSwingType});
    });
  }

  return {
    cycles,
    signals
  };
}

module.exports = { forecastCycles };
