// Logging and Record-Keeping
// Placeholder: implement logging for patterns, trades, signals


const fs = require('fs');
const path = require('path');
const LOG_FILE = path.join(__dirname, 'gann.log');

/**
 * Logs an event with timestamp and type to gann.log and console.
 * @param {Object} event - { type: string, message: string, [data]: any }
 */
function logEvent(event) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    ...event
  };
  const logLine = JSON.stringify(logEntry) + '\n';
  fs.appendFileSync(LOG_FILE, logLine);
  console.log('Gann Log:', logEntry);
}

module.exports = { logEvent };
