// Gann Analysis Backend Entry Point
// This file wires up all Gann analysis modules and exposes main analysis functions

const section = require('./marketSection');
const supportResistance = require('./supportResistance');
const volume = require('./volumeAnalysis');
const patterns = require('./patternRecognition');
const cycles = require('./cycleForecasting');
const risk = require('./riskManagement');
const logger = require('./logger');

module.exports = {
  section,
  supportResistance,
  volume,
  patterns,
  cycles,
  risk,
  logger
};
