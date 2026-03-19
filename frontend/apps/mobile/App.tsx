import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Pressable, StatusBar, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { createMobileCompositionRoot, type MobileCompositionRoot } from "./src/app/mobileCompositionRoot";
import { ThemeProvider, useTheme } from "./src/app/ThemeContext";
import { WordsScreen } from "./src/screens/WordsScreen";
import { StudyScreen } from "./src/screens/StudyScreen";
import { DataScreen } from "./src/screens/DataScreen";
import { ExamplesScreen } from "./src/screens/ExamplesScreen";
import { debugLogger } from "./src/infra/debugLogger";

// アプリ起動をログに記録（クラッシュ前後の区切りとして機能する）
debugLogger.log("App", `===== APP START ${new Date().toISOString()} =====`);

// SyncScreen is kept for future server sync UI
// import { SyncScreen } from "./src/screens/SyncScreen";

type MobileRoute = "words" | "study" | "quiz" | "data";

type TabIcon =
  | { lib: "Ionicons"; name: keyof typeof Ionicons.glyphMap }
  | { lib: "AntDesign"; name: keyof typeof AntDesign.glyphMap };

const TABS: { route: MobileRoute; label: string; icon: TabIcon }[] = [
  { route: "words", label: "Words", icon: { lib: "Ionicons", name: "book-outline" } },
  { route: "study", label: "Cards", icon: { lib: "Ionicons", name: "layers-outline" } },
  { route: "quiz", label: "Fill", icon: { lib: "AntDesign", name: "form" } },
  { route: "data", label: "Settings", icon: { lib: "Ionicons", name: "settings-outline" } },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { isDark, colors } = useTheme();
  const [route, setRoute] = useState<MobileRoute>("words");
  const [compositionRoot, setCompositionRoot] = useState<MobileCompositionRoot | null>(null);
  const [quizPreferredWordId, setQuizPreferredWordId] = useState<string | null>(null);
  const [studyPreferredWordId, setStudyPreferredWordId] = useState<string | null>(null);
  const [wordsResetKey, setWordsResetKey] = useState(0);
  const routeHistoryRef = useRef<Array<{ route: MobileRoute; wordId: string | null }>>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    void createMobileCompositionRoot().then((root) => {
      setCompositionRoot(root);
    });
  }, []);

  // Android hardware back button:
  // 1. If cross-feature history exists → go back to previous feature (restoring same word)
  // 2. Otherwise, if not on words tab → go to words list first
  // 3. On words list with no history → allow app close
  useEffect(() => {
    const onBackPress = () => {
      const history = routeHistoryRef.current;
      if (history.length > 0) {
        const entry = history[history.length - 1];
        routeHistoryRef.current = history.slice(0, -1);
        // Restore the word that was being worked on in the destination screen
        if (entry.route === "study") setStudyPreferredWordId(entry.wordId);
        else if (entry.route === "quiz") setQuizPreferredWordId(entry.wordId);
        setRoute(entry.route);
        return true;
      }
      if (route !== "words") {
        setRoute("words");
        return true;
      }
      return false; // on words list with no history → allow app close
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [route]);

  // Tab bar press: clear navigation history and preferred word state
  // "words" タブは常に wordsResetKey をインクリメントして一覧に戻す
  const navigateToTab = useCallback((tab: MobileRoute) => {
    routeHistoryRef.current = [];
    setQuizPreferredWordId(null);
    setStudyPreferredWordId(null);
    if (tab === "words") setWordsResetKey((k) => k + 1);
    setRoute(tab);
  }, []);

  // Cross-feature navigation: Study → Quiz for a specific word
  // Store {route: "study", wordId} so pressing back restores Study with same word
  const navigateToQuiz = useCallback((wordId: string) => {
    routeHistoryRef.current = [...routeHistoryRef.current, { route, wordId }];
    setQuizPreferredWordId(wordId);
    setRoute("quiz");
  }, [route]);

  // Cross-feature navigation: Quiz → Study for a specific word
  // Store {route: "quiz", wordId} so pressing back restores Quiz with same word
  const navigateToStudy = useCallback((wordId: string) => {
    routeHistoryRef.current = [...routeHistoryRef.current, { route, wordId }];
    setStudyPreferredWordId(wordId);
    setRoute("study");
  }, [route]);

  const routeContent = useMemo(() => {
    if (!compositionRoot) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Ionicons name="book-outline" size={40} color={colors.textMuted} />
          <Text style={{ fontSize: 16, color: colors.textSub }}>Loading...</Text>
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
          studyService={compositionRoot.studyService}
          preferredWordId={quizPreferredWordId}
          onNavigateToStudy={navigateToStudy}
        />
      );
    }

    if (route === "data") {
      return <DataScreen ioGateway={compositionRoot.ioGateway} />;
    }

    return <WordsScreen service={compositionRoot.wordService} resetKey={wordsResetKey} />;
  }, [compositionRoot, route, quizPreferredWordId, studyPreferredWordId, navigateToQuiz, navigateToStudy, colors, wordsResetKey]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

      <View style={{ flex: 1 }}>
        {routeContent}
      </View>

      {/* Bottom Tab Bar */}
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          paddingBottom: Math.max(insets.bottom, 8),
        }}
      >
        {TABS.map((tab) => (
          <BottomTab
            key={tab.route}
            label={tab.label}
            tabIcon={tab.icon}
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
  tabIcon,
  active,
  onPress,
}: {
  label: string;
  tabIcon: TabIcon;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const iconColor = active ? colors.primary : colors.textSub;
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
      {tabIcon.lib === "AntDesign" ? (
        <AntDesign name={tabIcon.name} size={24} color={iconColor} />
      ) : (
        <Ionicons name={tabIcon.name} size={24} color={iconColor} />
      )}
      <Text
        style={{
          fontSize: 10,
          fontWeight: active ? "700" : "400",
          color: iconColor,
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
            backgroundColor: colors.primary,
            borderRadius: 1,
          }}
        />
      )}
    </Pressable>
  );
}
