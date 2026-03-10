const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
// Two levels up: apps/mobile -> apps -> frontend (workspace root)
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire workspace so Metro can resolve files in frontend/src/
config.watchFolders = [workspaceRoot];

// Resolve node_modules from both the app directory and the workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
