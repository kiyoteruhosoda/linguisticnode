/**
 * Expo config plugin that sets the reactNativeVersion ext property
 * in the root Android build.gradle.
 *
 * This is needed because in an npm workspace, expo-dev-launcher's
 * auto-detection resolves react-native from the hoisted root
 * (0.84.0 for react-native-web) instead of the mobile app's
 * version (0.76.9), causing the wrong Gradle source set (rn77)
 * to be selected.
 */
const { withProjectBuildGradle } = require('expo/config-plugins');

function withReactNativeVersion(config) {
  return withProjectBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    // Inject reactNativeVersion ext property into the root build.gradle
    // so that expo-dev-launcher's safeExtGet picks it up instead of
    // auto-detecting from node_modules.
    if (!buildGradle.includes('reactNativeVersion')) {
      config.modResults.contents = buildGradle.replace(
        /buildscript\s*\{/,
        `buildscript {
    ext {
        reactNativeVersion = "0.76.9"
    }`
      );
    }

    return config;
  });
}

module.exports = withReactNativeVersion;
