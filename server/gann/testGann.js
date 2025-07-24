// Test script for Gann backend modules
const gann = require('./index');

// Mock price data (replace with real data for production)
const priceData = [
  {open: 100, high: 105, low: 99, close: 104, time: '2025-07-01'},
  {open: 104, high: 106, low: 102, close: 105, time: '2025-07-02'},
  {open: 105, high: 108, low: 104, close: 107, time: '2025-07-03'},
  {open: 107, high: 110, low: 106, close: 109, time: '2025-07-04'},
  {open: 109, high: 111, low: 108, close: 110, time: '2025-07-05'},
  {open: 110, high: 112, low: 109, close: 111, time: '2025-07-06'},
  {open: 111, high: 113, low: 110, close: 112, time: '2025-07-07'},
  {open: 112, high: 115, low: 111, close: 114, time: '2025-07-08'},
  {open: 114, high: 116, low: 113, close: 115, time: '2025-07-09'},
  {open: 115, high: 117, low: 114, close: 116, time: '2025-07-10'}
];
const volumeData = [1000, 1200, 1300, 1500, 1400, 1600, 1700, 1800, 1750, 1900];
const tradeHistory = [
  {entry: 105, exit: 110, result: 5, direction: 'long', priceDataAtEntry: priceData.slice(0,5)},
  {entry: 110, exit: 108, result: -2, direction: 'long', priceDataAtEntry: priceData.slice(0,6)},
  {entry: 108, exit: 107, result: -1, direction: 'long', priceDataAtEntry: priceData.slice(0,7)}
];
const capital = 10000;

console.log('--- Market Section ---');
console.log(gann.section.detectMarketSection(priceData, volumeData));

console.log('--- Support/Resistance ---');
console.log(gann.supportResistance.calculateLevels(priceData, {extended: true}));

console.log('--- Volume Analysis ---');
console.log(gann.volume.analyzeVolume(volumeData, priceData));

console.log('--- Pattern Recognition ---');
console.log(gann.patterns.recognizePatterns(priceData));

console.log('--- Cycle Forecasting ---');
console.log(gann.cycles.forecastCycles(priceData));

console.log('--- Risk Management ---');
console.log(gann.risk.manageRisk(tradeHistory, capital));

gann.logger.logEvent({type: 'test', message: 'Test run complete', data: {timestamp: new Date().toISOString()}});
