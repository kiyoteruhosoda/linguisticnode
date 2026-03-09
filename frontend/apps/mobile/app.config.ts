// frontend/apps/mobile/app.config.ts

import type { ExpoConfig } from 'expo/config';

const appVersion = process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0';
const versionCode = Number.parseInt(process.env.EXPO_PUBLIC_ANDROID_VERSION_CODE ?? '1', 10);

const config: ExpoConfig = {
  name: 'linguisticnode',
  slug: 'linguisticnode',
  scheme: 'linguisticnode',
  version: appVersion,
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  platforms: ['ios', 'android', 'web'],
  newArchEnabled: true,

  ios: {
    bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_ID ?? 'com.linguisticnode.app',
    // iOS のビルド番号（文字列）。App Store 提出を見据えるなら入れておくのが無難
    buildNumber: process.env.EXPO_PUBLIC_IOS_BUILD_NUMBER ?? '1',
  },

  android: {
    package: process.env.EXPO_PUBLIC_ANDROID_APPLICATION_ID ?? 'com.linguisticnode.app',
    versionCode: Number.isNaN(versionCode) ? 1 : versionCode,
    permissions: [],
  },

  plugins: [
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          minSdkVersion: 24,
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '06cdd41b-e8e7-4cce-ad1f-5ca2aed8fa53',
    },
  },
};

export default config;