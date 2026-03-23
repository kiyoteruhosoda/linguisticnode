import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import type { Rating } from "../../../../src/api/types";
import type { ExampleTestItem } from "../../../../src/api/types";
import { checkAnswer, createBlankedSentence } from "../../../../src/core/examples/exampleSentencePolicy";
import type { MobileExamplesService, MobileStudyService } from "../app/mobileServices";
import { mobileSpeechService } from "../app/mobileSpeechApplication";
import { useTheme } from "../app/ThemeContext";
import { TextActionMenu } from "../components/TextActionMenu";
import { debugLogger } from "../infra/debugLogger";

type Feedback = "correct" | "incorrect" | null;

export function ExamplesScreen({
  examplesService,
  studyService,
  preferredWordId,
  onNavigateToStudy,
  appliedTags,
  onAppliedTagsChange,
}: {
  examplesService: MobileExamplesService;
  studyService?: MobileStudyService;
  preferredWordId?: string | null;
  onNavigateToStudy?: (wordId: string) => void;
  appliedTags: string[];
  onAppliedTagsChange: (tags: string[]) => void;
}) {
  const { colors } = useTheme();
  const [example, setExample] = useState<ExampleTestItem | null>(null);
  const [blankedSentence, setBlankedSentence] = useState("");
  const [actualWord, setActualWord] = useState<string | null>(null);
  const lastExampleIdRef = useRef<string | null>(null);
  const preferredWordIdRef = useRef<string | null>(preferredWordId ?? null);
  const gradedRef = useRef(false);

  const [userInput, setUserInput] = useState("");
  const [submittedInput, setSubmittedInput] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showWordInfo, setShowWordInfo] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tag filter state
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([...appliedTags]);

  const canSpeak = mobileSpeechService.canSpeak();

  // アンマウント時に音声を確実に停止（画面遷移後に音声が残らないようにする）
  useEffect(() => {
    return () => {
      debugLogger.log("ExamplesScreen", "unmount -> stop()");
      mobileSpeechService.stop();
    };
  }, []);

  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const handleSpeak = useCallback(async (key: string, text: string) => {
    if (!text.trim()) return;
    debugLogger.log("ExamplesScreen", `handleSpeak key=${key} text="${text.slice(0, 30)}"`);
    setSpeakingKey(key);
    try {
      await mobileSpeechService.speakEnglish(text);
    } catch (e) {
      debugLogger.log("ExamplesScreen", `handleSpeak error: ${String(e)}`);
    } finally {
      setSpeakingKey(null);
    }
  }, []);

  const [menuVisible, setMenuVisible] = useState(false);
  const [menuText, setMenuText] = useState("");
  const showMenu = useCallback((text: string) => {
    if (!text.trim()) return;
    setMenuText(text);
    setMenuVisible(true);
  }, []);

  useEffect(() => {
    examplesService.getAllTags().then(setAllTags).catch(() => {});
  }, [examplesService]);

  const loadNext = useCallback(async (cursor: string | null) => {
    setError(null);
    setUserInput("");
    setSubmittedInput("");
    setFeedback(null);
    setShowAnswer(false);
    setShowWordInfo(false);
    gradedRef.current = false;
    setLoading(true);
    try {
      const tags = appliedTags.length > 0 ? appliedTags : undefined;
      const preferred = cursor ? null : preferredWordIdRef.current;
      const next = await examplesService.fetchNextExample(tags, cursor, preferred);
      if (preferred) {
        preferredWordIdRef.current = null;
      }
      if (!next) {
        setExample(null);
        setBlankedSentence("");
        setActualWord(null);
        lastExampleIdRef.current = null;
      } else {
        setExample(next);
        const result = createBlankedSentence(next.en, next.word.headword);
        setBlankedSentence(result.blanked);
        setActualWord(result.actualWord);
        lastExampleIdRef.current = next.id;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [examplesService, appliedTags]);

  useEffect(() => {
    lastExampleIdRef.current = null;
    void loadNext(null);
  }, [appliedTags, loadNext]);

  const handleSubmit = () => {
    if (!example) return;
    Keyboard.dismiss();
    const target = actualWord || example.word.headword;
    const trimmed = userInput.trim();
    const isCorrect = trimmed ? checkAnswer(trimmed, target) : false;

    setSubmittedInput(trimmed);
    setFeedback(isCorrect ? "correct" : "incorrect");
    setShowAnswer(true);

    // Grade memory once per example (not on retry)
    if (!gradedRef.current && studyService) {
      gradedRef.current = true;
      const rating: Rating = isCorrect ? "good" : "again";
      void studyService.gradeCard(example.word.id, rating);
    }
  };

  const handleRetry = () => {
    setUserInput("");
    setSubmittedInput("");
    setFeedback(null);
    setShowAnswer(false);
  };

  const handleNext = () => {
    void loadNext(lastExampleIdRef.current);
  };

  const applyTagFilter = () => {
    onAppliedTagsChange([...selectedTags]);
    setShowTagPanel(false);
  };

  const clearTagFilter = () => {
    setSelectedTags([]);
    onAppliedTagsChange([]);
    setShowTagPanel(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>Fill</Text>

        {allTags.length > 0 && (
          <Pressable
            onPress={() => {
              setSelectedTags([...appliedTags]);
              setShowTagPanel((v) => !v);
            }}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: appliedTags.length > 0 ? colors.primary : colors.borderMid,
              backgroundColor: appliedTags.length > 0 ? colors.primaryBg : pressed ? colors.surfacePressed : colors.surface,
            })}
          >
            <FontAwesome6 name="tag" size={13} color={appliedTags.length > 0 ? colors.primary : colors.textDim} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: appliedTags.length > 0 ? colors.primary : colors.textDim }}>
              {appliedTags.length > 0 ? `Tags (${appliedTags.length})` : "Tags"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Tag Filter Panel */}
      {showTagPanel && allTags.length > 0 && (
        <View
          style={{
            backgroundColor: colors.surface,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {allTags.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => toggleTag(tag)}
                style={{
                  paddingVertical: 5,
                  paddingHorizontal: 12,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: selectedTags.includes(tag) ? colors.primary : colors.borderMid,
                  backgroundColor: selectedTags.includes(tag) ? colors.primaryBg : colors.bg,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: selectedTags.includes(tag) ? "700" : "400", color: selectedTags.includes(tag) ? colors.primary : colors.textDim }}>
                  {selectedTags.includes(tag) ? "✓ " : ""}{tag}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={clearTagFilter}
              style={({ pressed }) => ({
                flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1,
                borderColor: colors.borderMid, backgroundColor: pressed ? colors.surfacePressed : colors.surface, alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textSub }}>Clear</Text>
            </Pressable>
            <Pressable
              onPress={applyTagFilter}
              style={({ pressed }) => ({
                flex: 1, paddingVertical: 10, borderRadius: 8,
                backgroundColor: pressed ? colors.primaryPressed : colors.primary, alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>Apply</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Body */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <FontAwesome6 name="edit" size={40} color={colors.textMuted} />
          <Text style={{ fontSize: 15, color: colors.textSub, marginTop: 12 }}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
          <Ionicons name="warning-outline" size={40} color={colors.ratingAgain.color} />
          <Text style={{ fontSize: 15, color: colors.ratingAgain.color, textAlign: "center" }}>{error}</Text>
          <Pressable
            onPress={() => void loadNext(null)}
            style={({ pressed }) => ({ backgroundColor: pressed ? colors.primaryPressed : colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 })}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
          </Pressable>
        </View>
      ) : !example ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
          <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>No examples available</Text>
          <Text style={{ fontSize: 14, color: colors.textSub, textAlign: "center" }}>
            Add example sentences to your words first.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          alwaysBounceVertical={false}
        >
          {/* Quiz Card */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.07,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            {/* Card Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: colors.surfaceAlt,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderLight,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ backgroundColor: colors.primaryBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>{example.word.pos}</Text>
                </View>
                {example.word.tags.map((tag) => (
                  <View key={tag} style={{ backgroundColor: colors.surfacePressed, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 11, color: colors.textSub }}>{tag}</Text>
                  </View>
                ))}
              </View>
              {canSpeak && (
                <Pressable
                  onPress={() => handleSpeak("header", example.en)}
                  style={({ pressed }) => ({
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: speakingKey === "header" ? colors.primary : pressed ? colors.primaryBgPressed : colors.bg,
                    borderWidth: 1,
                    borderColor: colors.primary,
                    alignItems: "center", justifyContent: "center",
                  })}
                >
                  <Ionicons name="volume-high-outline" size={16} color={speakingKey === "header" ? "#fff" : colors.primary} />
                </Pressable>
              )}
            </View>

            {/* Card Body */}
            <View style={{ padding: 20, gap: 14 }}>
              {/* Sentence with blank */}
              <Text style={{ fontSize: 17, color: colors.text, lineHeight: 26, textAlign: "center" }}onLongPress={() => showMenu(example.en)}>
                {blankedSentence || example.en}
              </Text>

              {/* Pre-answer: translation toggle (shows only example.ja) */}
              {!showAnswer && (
                <>
                  <Pressable
                    onPress={() => setShowWordInfo((v) => !v)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      paddingVertical: 9,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: showWordInfo ? colors.primary : colors.borderMid,
                      backgroundColor: showWordInfo ? colors.primaryBg : pressed ? colors.surfacePressed : colors.surface,
                    })}
                  >
                    <Ionicons
                      name={showWordInfo ? "eye-off-outline" : "eye-outline"}
                      size={17}
                      color={showWordInfo ? colors.primary : colors.textDim}
                    />
                    <Text style={{ fontSize: 14, fontWeight: "600", color: showWordInfo ? colors.primary : colors.textDim }}>
                      {showWordInfo ? "Hide translation" : "Show translation"}
                    </Text>
                  </Pressable>

                  {showWordInfo && example.ja ? (
                    <View
                      style={{
                        backgroundColor: colors.bg,
                        borderRadius: 10,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 14, color: colors.textSub, fontStyle: "italic" }}>{example.ja}</Text>
                    </View>
                  ) : null}
                </>
              )}

              {/* Pre-answer: input + Check + Open in Study */}
              {!showAnswer ? (
                <View style={{ gap: 10 }}>
                  <TextInput
                    value={userInput}
                    onChangeText={setUserInput}
                    placeholder="Type the missing word..."
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="done"
                    style={{
                      borderWidth: 1.5,
                      borderColor: colors.borderMid,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: colors.text,
                      backgroundColor: colors.bg,
                    }}
                  />
                  <Pressable
                    onPress={handleSubmit}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                      borderRadius: 10,
                      paddingVertical: 13,
                      alignItems: "center",
                    })}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Check</Text>
                  </Pressable>
                  {onNavigateToStudy && (
                    <Pressable
                      onPress={() => onNavigateToStudy(example.word.id)}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        paddingVertical: 9,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.textSub,
                        backgroundColor: pressed ? colors.surfacePressed : colors.surface,
                      })}
                    >
                      <Ionicons name="layers-outline" size={16} color={colors.textSub} />
                      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textSub }}>Open in Cards</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                /* Post-answer */
                <View style={{ gap: 10 }}>
                  {/* Feedback header */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      backgroundColor: feedback === "correct" ? "#d1e7dd" : "#f8d7da",
                      borderWidth: 1,
                      borderColor: feedback === "correct" ? "#a3cfbb" : "#f5c2c7",
                    }}
                  >
                    <Ionicons
                      name={feedback === "correct" ? "checkmark-circle-outline" : "close-circle-outline"}
                      size={20}
                      color={feedback === "correct" ? "#0a3622" : "#842029"}
                    />
                    <Text style={{ fontSize: 15, fontWeight: "700", color: feedback === "correct" ? "#0a3622" : "#842029" }}>
                      {feedback === "correct" ? "Correct!" : "Incorrect"}
                    </Text>
                  </View>

                  {/* Word info (always shown after answering) */}
                  <View
                    style={{
                      backgroundColor: colors.bg,
                      borderRadius: 10,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                      gap: 6,
                    }}
                  >
                    {feedback === "incorrect" && submittedInput ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <Text style={{ fontSize: 13, color: "#842029" }}>Your answer:</Text>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#842029", fontStyle: "italic" }}>
                          {submittedInput}
                        </Text>
                      </View>
                    ) : null}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}onLongPress={() => showMenu(actualWord || example.word.headword)}>
                        {actualWord || example.word.headword}
                      </Text>
                      {example.word.pronunciation ? (
                        <Text style={{ fontSize: 14, color: colors.textSub }}>({example.word.pronunciation})</Text>
                      ) : null}
                      {canSpeak && (
                        <Pressable
                          onPress={() => handleSpeak("answer", actualWord || example.word.headword)}
                          style={({ pressed }) => ({
                            width: 32, height: 32, borderRadius: 16,
                            backgroundColor: speakingKey === "answer" ? colors.primary : pressed ? colors.primaryBgPressed : colors.bg,
                            borderWidth: 1,
                            borderColor: colors.primary,
                            alignItems: "center", justifyContent: "center",
                          })}
                        >
                          <Ionicons name="volume-high-outline" size={16} color={speakingKey === "answer" ? "#fff" : colors.primary} />
                        </Pressable>
                      )}
                    </View>
                    {example.ja ? (
                      <Text style={{ fontSize: 13, color: colors.textSub, fontStyle: "italic" }}onLongPress={() => showMenu(example.ja ?? "")}>{example.ja}</Text>
                    ) : null}
                    <Text style={{ fontSize: 14, color: colors.textDim }}>{example.word.meaningJa}</Text>
                  </View>

                  {/* Retry button */}
                  <Pressable
                    onPress={handleRetry}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      paddingVertical: 12,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: feedback === "incorrect" ? colors.ratingAgain.color : colors.borderMid,
                      backgroundColor: pressed ? (feedback === "incorrect" ? colors.ratingAgain.bg : colors.surfacePressed) : colors.surface,
                    })}
                  >
                    <Ionicons name="refresh-outline" size={17} color={feedback === "incorrect" ? colors.ratingAgain.color : colors.textSub} />
                    <Text style={{ fontSize: 14, fontWeight: "700", color: feedback === "incorrect" ? colors.ratingAgain.color : colors.textSub }}>Retry</Text>
                  </Pressable>

                  {/* Next button */}
                  <Pressable
                    onPress={handleNext}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                      borderRadius: 10,
                      paddingVertical: 13,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    })}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Next</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </Pressable>

                  {/* Open in Study */}
                  {onNavigateToStudy && (
                    <Pressable
                      onPress={() => onNavigateToStudy(example.word.id)}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        paddingVertical: 9,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.textSub,
                        backgroundColor: pressed ? colors.surfacePressed : colors.surface,
                      })}
                    >
                      <Ionicons name="layers-outline" size={16} color={colors.textSub} />
                      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textSub }}>Open in Cards</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}
      <TextActionMenu visible={menuVisible} text={menuText} onClose={() => setMenuVisible(false)} />
    </View>
  );
}
