import { useEffect, useMemo, useState } from "react";
import { Pressable, StatusBar, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { createMobileCompositionRoot, type MobileCompositionRoot } from "./src/app/mobileCompositionRoot";
import { WordsScreen } from "./src/screens/WordsScreen";
import { StudyScreen } from "./src/screens/StudyScreen";
import { SyncScreen } from "./src/screens/SyncScreen";

type MobileRoute = "words" | "study" | "sync";

const TABS: { route: MobileRoute; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { route: "words", label: "単語帳", icon: "book-outline" },
  { route: "study", label: "学習", icon: "school-outline" },
  { route: "sync", label: "同期", icon: "cloud-outline" },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [route, setRoute] = useState<MobileRoute>("words");
  const [compositionRoot, setCompositionRoot] = useState<MobileCompositionRoot | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    void createMobileCompositionRoot().then((root) => {
      setCompositionRoot(root);
    });
  }, []);

  const routeContent = useMemo(() => {
    if (!compositionRoot) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Ionicons name="book-outline" size={40} color="#6c757d" />
          <Text style={{ fontSize: 16, color: "#6c757d" }}>起動中...</Text>
        </View>
      );
    }

    if (route === "study") {
      return <StudyScreen studyService={compositionRoot.studyService} />;
    }

    if (route === "sync") {
      return <SyncScreen syncService={compositionRoot.syncService} />;
    }

    return <WordsScreen service={compositionRoot.wordService} />;
  }, [compositionRoot, route]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        {routeContent}
      </View>

      {/* Bottom Tab Bar — includes bottom safe area inset */}
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderTopColor: "#e9ecef",
          backgroundColor: "#fff",
          paddingBottom: Math.max(insets.bottom, 8),
        }}
      >
        {TABS.map((tab) => (
          <BottomTab
            key={tab.route}
            label={tab.label}
            icon={tab.icon}
            active={route === tab.route}
            onPress={() => setRoute(tab.route)}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

function BottomTab({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        gap: 4,
      }}
    >
      <Ionicons name={icon} size={24} color={active ? "#0d6efd" : "#6c757d"} />
      <Text
        style={{
          fontSize: 11,
          fontWeight: active ? "700" : "400",
          color: active ? "#0d6efd" : "#6c757d",
        }}
      >
        {label}
      </Text>
      {active && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: "25%",
            right: "25%",
            height: 2,
            backgroundColor: "#0d6efd",
            borderRadius: 1,
          }}
        />
      )}
    </Pressable>
  );
}
