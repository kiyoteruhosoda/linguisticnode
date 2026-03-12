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

  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0d6efd',
  },
  web: {
    favicon: './assets/favicon.png',
  },

  ios: {
    bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_ID ?? 'com.linguisticnode.app',
    infoPlist: {
      // 標準アルゴリズム（HTTPS/TLS）のみ使用。輸出規制の免除対象
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: process.env.EXPO_PUBLIC_ANDROID_APPLICATION_ID ?? 'com.linguisticnode.app',
    versionCode: Number.isNaN(versionCode) ? 1 : versionCode,
    permissions: [],
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0d6efd',
    },
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
    './plugins/withReactNativeVersion',
  ],
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '06cdd41b-e8e7-4cce-ad1f-5ca2aed8fa53',
    },
  },
};

export default config;