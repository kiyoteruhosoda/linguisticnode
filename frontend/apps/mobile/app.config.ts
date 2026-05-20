// frontend/apps/mobile/app.config.ts

import type { ExpoConfig } from 'expo/config';

// EAS Build の autoIncrement 使用時は EXPO_PUBLIC_ANDROID_VERSION_CODE 未設定になる。
// Play Store は versionCode が常に増加している必要があるため、最低値を 10 に設定。
const versionCode = Number.parseInt(process.env.EXPO_PUBLIC_ANDROID_VERSION_CODE ?? '10', 10);

// バージョン名: yyyyMMdd-{versionCode}
// EXPO_PUBLIC_APP_VERSION が明示的に指定された場合はそちらを優先
const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // yyyyMMdd
const appVersion = process.env.EXPO_PUBLIC_APP_VERSION ?? `${today}-${versionCode}`;

// Git コミットハッシュ: Azure Pipelines では EXPO_PUBLIC_GIT_COMMIT、
// EAS Build では EAS_BUILD_GIT_COMMIT_HASH が自動的に提供される
const gitCommit =
  process.env.EXPO_PUBLIC_GIT_COMMIT ??
  process.env.EAS_BUILD_GIT_COMMIT_HASH ??
  '';

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
    [
      'expo-share-intent',
      {
        // JSON ファイルを他アプリから共有されたときにアプリで受け取る
        iosActivationRules: {
          NSExtensionActivationSupportsFileWithMaxCount: 1,
        },
        androidIntentFilters: ['application/json'],
        androidMainActivityAttributes: {
          'android:launchMode': 'singleTask',
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '06cdd41b-e8e7-4cce-ad1f-5ca2aed8fa53',
    },
    // JS ランタイムからアクセス可能なビルド情報
    // expo-constants の Constants.expoConfig.extra で参照できる
    appVersion,
    versionCode: Number.isNaN(versionCode) ? 1 : versionCode,
    gitCommit,
  },
};

export default config;
