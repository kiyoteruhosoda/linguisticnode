import type * as React from 'react';

type IconComponent = React.ComponentType<Record<string, unknown>> & {
  glyphMap: Record<string, number>;
};

declare module '@expo/vector-icons' {
  export const Ionicons: IconComponent;
}

declare module 'react-native-safe-area-context' {
  export const SafeAreaView: React.ComponentType<Record<string, unknown>>;
}
