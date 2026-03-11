import { useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, StatusBar, Text, View } from "react-native";
import { createMobileCompositionRoot, type MobileCompositionRoot } from "./src/app/mobileCompositionRoot";
import { WordsScreen } from "./src/screens/WordsScreen";
import { StudyScreen } from "./src/screens/StudyScreen";
import { SyncScreen } from "./src/screens/SyncScreen";

type MobileRoute = "words" | "study" | "sync";

const TABS: { route: MobileRoute; label: string; icon: string }[] = [
  { route: "words", label: "単語帳", icon: "📚" },
  { route: "study", label: "学習", icon: "🧠" },
  { route: "sync", label: "同期", icon: "☁️" },
];

export default function App() {
  const [route, setRoute] = useState<MobileRoute>("words");
  const [compositionRoot, setCompositionRoot] = useState<MobileCompositionRoot | null>(null);

  useEffect(() => {
    void createMobileCompositionRoot().then((root) => {
      setCompositionRoot(root);
    });
  }, []);

  const routeContent = useMemo(() => {
    if (!compositionRoot) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Text style={{ fontSize: 32 }}>📚</Text>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        {routeContent}
      </View>

      {/* Bottom Tab Bar */}
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderTopColor: "#e9ecef",
          backgroundColor: "#fff",
          paddingBottom: 4,
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
  icon: string;
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
      <Text style={{ fontSize: 22 }}>{icon}</Text>
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
