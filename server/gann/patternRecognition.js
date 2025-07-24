// Gann and Wave Pattern Recognition
// Recognizes swing highs/lows, 1-2-3-A-B-C patterns, breakaway points, double/triple tops/bottoms, and signals.


/**
 * Recognizes Gann and wave-based patterns (impulse/corrective, breakaways, tops/bottoms).
 * @param {Array} priceData - Array of price objects: [{open, high, low, close, time}, ...]
 * @returns {Object} { patterns: [{type, index, label}], signals: [string] }
 */
function recognizePatterns(priceData) {
  // 1. Find swing highs/lows (reuse logic from marketSection)
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
  const closes = priceData.map(p => p.close);
  const swings = findSwings(closes);

  // 2. Attempt to label a basic 1-2-3-A-B-C pattern (simple heuristic)
  let patterns = [];
  if (swings.highs.length >= 3 && swings.lows.length >= 3) {
    // Label 1,2,3 (impulse) and A,B,C (correction)
    patterns.push({type: 'impulse', index: swings.highs[0], label: '1'});
    patterns.push({type: 'impulse', index: swings.lows[0], label: '2'});
    patterns.push({type: 'impulse', index: swings.highs[1], label: '3'});
    patterns.push({type: 'correction', index: swings.lows[1], label: 'A'});
    patterns.push({type: 'correction', index: swings.highs[2], label: 'B'});
    patterns.push({type: 'correction', index: swings.lows[2], label: 'C'});
  }

  // 3. Detect breakaway points (price breaking above previous swing high or below swing low)
  let signals = [];
  if (swings.highs.length > 1 && closes[closes.length-1] > closes[swings.highs[swings.highs.length-2]]) {
    signals.push('Breakout above previous swing high');
  }
  if (swings.lows.length > 1 && closes[closes.length-1] < closes[swings.lows[swings.lows.length-2]]) {
    signals.push('Breakdown below previous swing low');
  }

  // 4. Detect double/triple tops/bottoms (same level within tolerance)
  function isNear(a, b, tol=0.01) { return Math.abs(a-b) < tol * Math.abs(a); }
  for (let i = 1; i < swings.highs.length; i++) {
    if (isNear(closes[swings.highs[i]], closes[swings.highs[i-1]])) {
      patterns.push({type: 'doubleTop', index: swings.highs[i], label: 'Double Top'});
    }
  }
  for (let i = 1; i < swings.lows.length; i++) {
    if (isNear(closes[swings.lows[i]], closes[swings.lows[i-1]])) {
      patterns.push({type: 'doubleBottom', index: swings.lows[i], label: 'Double Bottom'});
    }
  }

  return {
    patterns,
    signals
  };
}

module.exports = { recognizePatterns };
