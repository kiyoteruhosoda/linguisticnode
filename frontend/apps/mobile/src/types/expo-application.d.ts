/**
 * Type stub for expo-application (SDK 52 compatible).
 * The actual package is installed via package.json during EAS Build.
 * expo-application provides Application.nativeBuildVersion which returns
 * the actual native versionCode on Android (unlike Constants.nativeBuildVersion
 * which was removed in SDK 50+).
 */
declare module "expo-application" {
  /** On Android: the versionCode as a string. On iOS: CFBundleVersion. Null on web. */
  export const nativeBuildVersion: string | null;
  /** On Android: the versionName. On iOS: CFBundleShortVersionString. Null on web. */
  export const nativeApplicationVersion: string | null;
  /** The application ID (Android package name / iOS bundle identifier). */
  export const applicationId: string | null;
  /** Human-readable application name. */
  export const applicationName: string | null;
}
