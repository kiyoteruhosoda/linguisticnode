export type LicenseEntry = {
  name: string;
  version: string;
  license: string;
  repository: string;
};

export const licenses: LicenseEntry[] = [
  {
    name: "React",
    version: "18.3.1",
    license: "MIT",
    repository: "https://github.com/facebook/react",
  },
  {
    name: "React Native",
    version: "0.76.9",
    license: "MIT",
    repository: "https://github.com/facebook/react-native",
  },
  {
    name: "Expo",
    version: "52.x",
    license: "MIT",
    repository: "https://github.com/expo/expo",
  },
  {
    name: "@expo/vector-icons",
    version: "14.x",
    license: "MIT",
    repository: "https://github.com/expo/vector-icons",
  },
  {
    name: "expo-sqlite",
    version: "15.x",
    license: "MIT",
    repository: "https://github.com/expo/expo/tree/main/packages/expo-sqlite",
  },
  {
    name: "expo-file-system",
    version: "18.x",
    license: "MIT",
    repository: "https://github.com/expo/expo/tree/main/packages/expo-file-system",
  },
  {
    name: "expo-document-picker",
    version: "13.x",
    license: "MIT",
    repository: "https://github.com/expo/expo/tree/main/packages/expo-document-picker",
  },
  {
    name: "expo-sharing",
    version: "13.x",
    license: "MIT",
    repository: "https://github.com/expo/expo/tree/main/packages/expo-sharing",
  },
  {
    name: "expo-dev-client",
    version: "5.x",
    license: "MIT",
    repository: "https://github.com/expo/expo/tree/main/packages/expo-dev-client",
  },
  {
    name: "@react-native-async-storage/async-storage",
    version: "1.23.1",
    license: "MIT",
    repository: "https://github.com/react-native-async-storage/async-storage",
  },
  {
    name: "react-native-safe-area-context",
    version: "4.x",
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
    version: "0.80.x",
    license: "MIT",
    repository: "https://github.com/facebook/metro",
  },
];
