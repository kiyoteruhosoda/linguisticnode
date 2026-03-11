/* eslint-disable */
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

// Force react-native and react to resolve from the mobile app's local node_modules.
//
// Problem: files in frontend/packages/ui/ and frontend/src/ import 'react-native'.
// Metro's directory-tree walk reaches frontend/node_modules/react-native@0.84 for
// those files BEFORE checking extraNodeModules (which is only a fallback). RN 0.84
// ships VirtualView.js with `match` statement syntax that Metro 0.80.9's
// hermes-parser cannot parse. The mobile app pins react-native@0.76.9.
//
// Solution: resolver.resolveRequest intercepts imports BEFORE the directory walk,
// so we redirect all 'react-native' and 'react' imports to the mobile app's local
// node_modules where the correct versions (0.76.9 / 18.3.1) are installed.
const mobileNodeModules = path.resolve(projectRoot, 'node_modules');
const PINNED_PACKAGES = ['react-native', 'react'];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Extract the package name (handles scoped packages and sub-paths)
  const packageName = moduleName.startsWith('@')
    ? moduleName.split('/').slice(0, 2).join('/')
    : moduleName.split('/')[0];

  if (PINNED_PACKAGES.includes(packageName)) {
    try {
      const resolved = require.resolve(moduleName, { paths: [mobileNodeModules] });
      return { filePath: resolved, type: 'sourceFile' };
    } catch {
      // Module not found locally; fall through to Metro's default resolution
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
