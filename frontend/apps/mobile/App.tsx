import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Pressable, StatusBar, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { createMobileCompositionRoot, type MobileCompositionRoot } from "./src/app/mobileCompositionRoot";
import { WordsScreen } from "./src/screens/WordsScreen";
import { StudyScreen } from "./src/screens/StudyScreen";
import { DataScreen } from "./src/screens/DataScreen";
import { ExamplesScreen } from "./src/screens/ExamplesScreen";

// SyncScreen is kept for future server sync UI
// import { SyncScreen } from "./src/screens/SyncScreen";

type MobileRoute = "words" | "study" | "quiz" | "data";

const TABS: { route: MobileRoute; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { route: "words", label: "Words", icon: "book-outline" },
  { route: "study", label: "Study", icon: "school-outline" },
  { route: "quiz", label: "Quiz", icon: "pencil-outline" },
  { route: "data", label: "Data", icon: "archive-outline" },
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
  const [quizPreferredWordId, setQuizPreferredWordId] = useState<string | null>(null);
  const [studyPreferredWordId, setStudyPreferredWordId] = useState<string | null>(null);
  const routeHistoryRef = useRef<MobileRoute[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    void createMobileCompositionRoot().then((root) => {
      setCompositionRoot(root);
    });
  }, []);

  // Android hardware back button: go back to previous tab instead of closing app
  useEffect(() => {
    const onBackPress = () => {
      const history = routeHistoryRef.current;
      if (history.length > 0) {
        const prev = history[history.length - 1];
        routeHistoryRef.current = history.slice(0, -1);
        setRoute(prev);
        return true; // prevent default (app close)
      }
      return false; // allow default (app close)
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, []);

  // Tab bar press: clear navigation history and preferred word state
  const navigateToTab = useCallback((tab: MobileRoute) => {
    routeHistoryRef.current = [];
    setQuizPreferredWordId(null);
    setStudyPreferredWordId(null);
    setRoute(tab);
  }, []);

  // Cross-feature navigation: Study → Quiz for a specific word
  const navigateToQuiz = useCallback((wordId: string) => {
    routeHistoryRef.current = [...routeHistoryRef.current, route];
    setQuizPreferredWordId(wordId);
    setRoute("quiz");
  }, [route]);

  // Cross-feature navigation: Quiz → Study for a specific word
  const navigateToStudy = useCallback((wordId: string) => {
    routeHistoryRef.current = [...routeHistoryRef.current, route];
    setStudyPreferredWordId(wordId);
    setRoute("study");
  }, [route]);

  const routeContent = useMemo(() => {
    if (!compositionRoot) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Ionicons name="book-outline" size={40} color="#6c757d" />
          <Text style={{ fontSize: 16, color: "#6c757d" }}>Loading...</Text>
        </View>
      );
    }

    if (route === "study") {
      return (
        <StudyScreen
          studyService={compositionRoot.studyService}
          preferredWordId={studyPreferredWordId}
          onNavigateToQuiz={navigateToQuiz}
        />
      );
    }

    if (route === "quiz") {
      return (
        <ExamplesScreen
          examplesService={compositionRoot.examplesService}
          preferredWordId={quizPreferredWordId}
          onNavigateToStudy={navigateToStudy}
        />
      );
    }

    if (route === "data") {
      return <DataScreen ioGateway={compositionRoot.ioGateway} />;
    }

    return <WordsScreen service={compositionRoot.wordService} />;
  }, [compositionRoot, route, quizPreferredWordId, studyPreferredWordId, navigateToQuiz, navigateToStudy]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

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
          paddingBottom: Math.max(insets.bottom, 8),
        }}
      >
        {TABS.map((tab) => (
          <BottomTab
            key={tab.route}
            label={tab.label}
            icon={tab.icon}
            active={route === tab.route}
            onPress={() => navigateToTab(tab.route)}
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
          fontSize: 10,
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
