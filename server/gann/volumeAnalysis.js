// Volume Analysis
// Placeholder: implement volume spike/divergence/confirmation logic


/**
 * Analyzes volume for Gann signals: spikes, confirmation, divergence.
 * @param {Array} volumeData - Array of volume values (same length as priceData)
 * @param {Array} priceData - Array of price objects: [{open, high, low, close, time}, ...]
 * @returns {Object} { signal, details }
 */
function analyzeVolume(volumeData, priceData) {
  // 1. Detect volume spike (volume much higher than recent average)
  const lookback = 20;
  const recentVolumes = volumeData.slice(-lookback);
  const avg = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  const lastVol = volumeData[volumeData.length - 1];
  const spike = lastVol > avg * 1.5;

  // 2. Volume confirmation/divergence with price
  const closes = priceData.map(p => p.close);
  const lastClose = closes[closes.length - 1];
  const prevClose = closes[closes.length - 2];
  let priceMove = lastClose > prevClose ? 'up' : lastClose < prevClose ? 'down' : 'flat';
  let volumeSignal = 'neutral';
  if (spike && priceMove === 'up') volumeSignal = 'strong up (confirmed)';
  else if (spike && priceMove === 'down') volumeSignal = 'strong down (confirmed)';
  else if (!spike && priceMove !== 'flat') volumeSignal = 'divergence';

  // 3. Details for further analysis
  const details = {
    avgVolume: avg,
    lastVolume: lastVol,
    spike,
    priceMove,
    volumeSignal
  };

  return {
    signal: volumeSignal,
    details
  };
}

module.exports = { analyzeVolume };
