import type { ExpoConfig } from 'expo/config';

const appVersion = process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0';
const versionCode = Number.parseInt(process.env.EXPO_PUBLIC_ANDROID_VERSION_CODE ?? '1', 10);

const config: ExpoConfig = {
  name: 'LexiMemory',
  slug: 'leximemory',
  scheme: 'leximemory',
  version: appVersion,
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  platforms: ['ios', 'android', 'web'],
  newArchEnabled: true,
  android: {
    package: process.env.EXPO_PUBLIC_ANDROID_APPLICATION_ID ?? 'com.leximemory.app',
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
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? 'bdddf478-2ba3-4621-960c-071386234780',
    },
  },
};

export default config;
