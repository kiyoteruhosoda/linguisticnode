import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Rating } from "../../../../src/api/types";
import type { ExampleTestItem } from "../../../../src/api/types";
import { checkAnswer, createBlankedSentence } from "../../../../src/core/examples/exampleSentencePolicy";
import type { MobileExamplesService, MobileStudyService } from "../app/mobileServices";
import { mobileSpeechService } from "../app/mobileSpeechApplication";

type Feedback = "correct" | "incorrect" | null;

export function ExamplesScreen({
  examplesService,
  studyService,
  preferredWordId,
  onNavigateToStudy,
}: {
  examplesService: MobileExamplesService;
  studyService?: MobileStudyService;
  preferredWordId?: string | null;
  onNavigateToStudy?: (wordId: string) => void;
}) {
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [appliedTags, setAppliedTags] = useState<string[]>([]);

  const canSpeak = mobileSpeechService.canSpeak();

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
    setAppliedTags([...selectedTags]);
    setShowTagPanel(false);
  };

  const clearTagFilter = () => {
    setSelectedTags([]);
    setAppliedTags([]);
    setShowTagPanel(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "#fff",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: "#e9ecef",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#212529" }}>Quiz</Text>

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
              borderColor: appliedTags.length > 0 ? "#0d6efd" : "#dee2e6",
              backgroundColor: appliedTags.length > 0 ? "#e7f1ff" : pressed ? "#f1f3f5" : "#fff",
            })}
          >
            <Ionicons name="pricetag-outline" size={15} color={appliedTags.length > 0 ? "#0d6efd" : "#495057"} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: appliedTags.length > 0 ? "#0d6efd" : "#495057" }}>
              {appliedTags.length > 0 ? `Tags (${appliedTags.length})` : "Tags"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Tag Filter Panel */}
      {showTagPanel && allTags.length > 0 && (
        <View
          style={{
            backgroundColor: "#fff",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#e9ecef",
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
                  borderColor: selectedTags.includes(tag) ? "#0d6efd" : "#dee2e6",
                  backgroundColor: selectedTags.includes(tag) ? "#e7f1ff" : "#f8f9fa",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: selectedTags.includes(tag) ? "700" : "400", color: selectedTags.includes(tag) ? "#0d6efd" : "#495057" }}>
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
                borderColor: "#dee2e6", backgroundColor: pressed ? "#f1f3f5" : "#fff", alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#6c757d" }}>Clear</Text>
            </Pressable>
            <Pressable
              onPress={applyTagFilter}
              style={({ pressed }) => ({
                flex: 1, paddingVertical: 10, borderRadius: 8,
                backgroundColor: pressed ? "#0b5ed7" : "#0d6efd", alignItems: "center",
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
          <Ionicons name="pencil-outline" size={40} color="#adb5bd" />
          <Text style={{ fontSize: 15, color: "#6c757d", marginTop: 12 }}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
          <Ionicons name="warning-outline" size={40} color="#dc3545" />
          <Text style={{ fontSize: 15, color: "#dc3545", textAlign: "center" }}>{error}</Text>
          <Pressable
            onPress={() => void loadNext(null)}
            style={({ pressed }) => ({ backgroundColor: pressed ? "#0b5ed7" : "#0d6efd", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 })}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
          </Pressable>
        </View>
      ) : !example ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
          <Ionicons name="document-text-outline" size={48} color="#adb5bd" />
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#212529" }}>No examples available</Text>
          <Text style={{ fontSize: 14, color: "#6c757d", textAlign: "center" }}>
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
              backgroundColor: "#fff",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#e9ecef",
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
                backgroundColor: "#fafafa",
                borderBottomWidth: 1,
                borderBottomColor: "#f1f3f5",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ backgroundColor: "#e7f1ff", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#0d6efd" }}>{example.word.pos}</Text>
                </View>
                {example.word.tags.map((tag) => (
                  <View key={tag} style={{ backgroundColor: "#f1f3f5", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 11, color: "#6c757d" }}>{tag}</Text>
                  </View>
                ))}
              </View>
              {canSpeak && (
                <Pressable
                  onPress={() => mobileSpeechService.speakEnglish(example.en)}
                  style={({ pressed }) => ({
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: pressed ? "#e7f1ff" : "#f1f3f5",
                    alignItems: "center", justifyContent: "center",
                  })}
                >
                  <Ionicons name="volume-high-outline" size={17} color="#495057" />
                </Pressable>
              )}
            </View>

            {/* Card Body */}
            <View style={{ padding: 20, gap: 14 }}>
              {/* Sentence with blank */}
              <Text style={{ fontSize: 17, color: "#212529", lineHeight: 26, textAlign: "center" }}>
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
                      borderColor: showWordInfo ? "#0d6efd" : "#dee2e6",
                      backgroundColor: showWordInfo ? "#e7f1ff" : pressed ? "#f1f3f5" : "#fff",
                    })}
                  >
                    <Ionicons
                      name={showWordInfo ? "eye-off-outline" : "eye-outline"}
                      size={17}
                      color={showWordInfo ? "#0d6efd" : "#495057"}
                    />
                    <Text style={{ fontSize: 14, fontWeight: "600", color: showWordInfo ? "#0d6efd" : "#495057" }}>
                      {showWordInfo ? "Hide translation" : "Show translation"}
                    </Text>
                  </Pressable>

                  {showWordInfo && example.ja ? (
                    <View
                      style={{
                        backgroundColor: "#f8f9fa",
                        borderRadius: 10,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: "#e9ecef",
                      }}
                    >
                      <Text style={{ fontSize: 14, color: "#6c757d", fontStyle: "italic" }}>{example.ja}</Text>
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
                    placeholderTextColor="#adb5bd"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="done"
                    style={{
                      borderWidth: 1.5,
                      borderColor: "#dee2e6",
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: "#212529",
                      backgroundColor: "#f8f9fa",
                    }}
                  />
                  <Pressable
                    onPress={handleSubmit}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? "#0b5ed7" : "#0d6efd",
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
                        borderColor: "#6c757d",
                        backgroundColor: pressed ? "#f1f3f5" : "#fff",
                      })}
                    >
                      <Ionicons name="school-outline" size={16} color="#6c757d" />
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#6c757d" }}>Open in Study</Text>
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
                      backgroundColor: "#f8f9fa",
                      borderRadius: 10,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: "#e9ecef",
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
                      <Text style={{ fontSize: 17, fontWeight: "700", color: "#212529" }}>
                        {actualWord || example.word.headword}
                      </Text>
                      {example.word.pronunciation ? (
                        <Text style={{ fontSize: 14, color: "#6c757d" }}>({example.word.pronunciation})</Text>
                      ) : null}
                      {canSpeak && (
                        <Pressable
                          onPress={() => mobileSpeechService.speakEnglish(actualWord || example.word.headword)}
                          style={{ padding: 2 }}
                        >
                          <Ionicons name="volume-high-outline" size={17} color="#495057" />
                        </Pressable>
                      )}
                    </View>
                    {example.ja ? (
                      <Text style={{ fontSize: 13, color: "#6c757d", fontStyle: "italic" }}>{example.ja}</Text>
                    ) : null}
                    <Text style={{ fontSize: 14, color: "#495057" }}>{example.word.meaningJa}</Text>
                  </View>

                  {/* Retry button (incorrect only) */}
                  {feedback === "incorrect" && (
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
                        borderColor: "#dc3545",
                        backgroundColor: pressed ? "#fff5f5" : "#fff",
                      })}
                    >
                      <Ionicons name="refresh-outline" size={17} color="#dc3545" />
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#dc3545" }}>Retry</Text>
                    </Pressable>
                  )}

                  {/* Next button */}
                  <Pressable
                    onPress={handleNext}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? "#0b5ed7" : "#0d6efd",
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
                        borderColor: "#6c757d",
                        backgroundColor: pressed ? "#f1f3f5" : "#fff",
                      })}
                    >
                      <Ionicons name="school-outline" size={16} color="#6c757d" />
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#6c757d" }}>Open in Study</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
