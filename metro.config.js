// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// On Windows, spawning workers for all CPU cores simultaneously causes "spawn EPERM".
// Setting maxWorkers to 2 prevents process creation throttling while maintaining fast bundling.
config.maxWorkers = 2;

module.exports = config;
