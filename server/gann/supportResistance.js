// Support and Resistance Calculation
// Placeholder: implement Gann percentage level calculations


/**
 * Calculates Gann support and resistance levels for the full history of a market.
 * @param {Array} priceData - Array of price objects: [{open, high, low, close, time}, ...]
 * @param {Object} [options] - Optional: { extended: true } to include 150%, 200%, etc.
 * @returns {Array} Array of { label, value }
 */
function calculateLevels(priceData, options = {}) {
  // Find the lowest low and highest high in the data (major timeframe, e.g., monthly)
  let min = Infinity, max = -Infinity;
  priceData.forEach(p => {
    if (p.low < min) min = p.low;
    if (p.high > max) max = p.high;
  });
  const range = max - min;

  // Standard Gann levels (percentages)
  const basePercents = [0.125, 0.25, 0.333, 0.375, 0.5, 0.625, 0.667, 0.75, 0.875, 1];
  // Extended levels (future projections)
  const extendedPercents = [1.25, 1.5, 1.75, 2, 2.5, 3];
  const percents = options.extended ? basePercents.concat(extendedPercents) : basePercents;

  // Calculate levels and label them
  const levels = percents.map(p => {
    let label = (p * 100) + '%';
    return { label, value: min + range * p };
  });

  return {
    min,
    max,
    range,
    levels
  };
}

module.exports = { calculateLevels };
