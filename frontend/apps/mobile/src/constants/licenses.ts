export type LicenseEntry = {
  name: string;
  version: string;
  license: string;
  repository: string;
};

export const licenses: LicenseEntry[] = [
  {
    name: "React",
    version: "19.3.0",
    license: "MIT",
    repository: "https://github.com/facebook/react",
  },
  {
    name: "React Native",
    version: "0.88.0",
    license: "MIT",
    repository: "https://github.com/facebook/react-native",
  },
  {
    name: "Expo",
    version: "58.x",
    license: "MIT",
    repository: "https://github.com/expo/expo",
  },
  {
    name: "@expo/vector-icons",
    version: "15.x",
    license: "MIT",
    repository: "https://github.com/expo/vector-icons",
  },
  {
    name: "expo-sqlite",
    version: "58.x",
    license: "MIT",
    repository: "https://github.com/expo/expo/tree/main/packages/expo-sqlite",
  },
  {
    name: "expo-file-system",
    version: "58.x",
    license: "MIT",
    repository: "https://github.com/expo/expo/tree/main/packages/expo-file-system",
  },
  {
    name: "expo-document-picker",
    version: "58.x",
    license: "MIT",
    repository: "https://github.com/expo/expo/tree/main/packages/expo-document-picker",
  },
  {
    name: "expo-sharing",
    version: "58.x",
    license: "MIT",
    repository: "https://github.com/expo/expo/tree/main/packages/expo-sharing",
  },
  {
    name: "expo-dev-client",
    version: "58.x",
    license: "MIT",
    repository: "https://github.com/expo/expo/tree/main/packages/expo-dev-client",
  },
  {
    name: "@react-native-async-storage/async-storage",
    version: "2.2.0",
    license: "MIT",
    repository: "https://github.com/react-native-async-storage/async-storage",
  },
  {
    name: "react-native-safe-area-context",
    version: "5.x",
    license: "MIT",
    repository: "https://github.com/th3rdwave/react-native-safe-area-context",
  },
  {
    name: "react-native-tts",
    version: "4.x",
    license: "MIT",
    repository: "https://github.com/ak1394/react-native-tts",
  },
  {
    name: "Metro",
    version: "0.87.x",
    license: "MIT",
    repository: "https://github.com/facebook/metro",
  },
];
