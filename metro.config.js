const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Necessário para o SDK web do Firebase funcionar com o Metro do Expo.
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
