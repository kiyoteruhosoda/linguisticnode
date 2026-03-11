import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Rating } from "../../../../src/api/types";
import type { MobileStudyService } from "../app/mobileServices";
import { mobileSpeechService } from "../app/mobileSpeechApplication";

type Card = Awaited<ReturnType<MobileStudyService["fetchNextCard"]>>;

const RATINGS: { value: Rating; label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "again", label: "Again", icon: "refresh", color: "#dc3545", bg: "#fff5f5" },
  { value: "hard", label: "Hard", icon: "hand-left-outline", color: "#fd7e14", bg: "#fff8f0" },
  { value: "good", label: "Good", icon: "thumbs-up-outline", color: "#198754", bg: "#f0fff4" },
  { value: "easy", label: "Easy", icon: "flash-outline", color: "#0d6efd", bg: "#f0f8ff" },
];

function getMemoryInfo(level: number): { label: string; color: string; bg: string } {
  if (level === 0) return { label: "New", color: "#6c757d", bg: "#f1f3f5" };
  if (level <= 3) return { label: "Learning", color: "#e67700", bg: "#fff3bf" };
  if (level <= 6) return { label: "Review", color: "#1971c2", bg: "#e7f5ff" };
  return { label: "Mastered", color: "#2b8a3e", bg: "#ebfbee" };
}

export function StudyScreen({
  studyService,
  preferredWordId,
  onNavigateToQuiz,
}: {
  studyService: MobileStudyService;
  preferredWordId?: string | null;
  onNavigateToQuiz?: (wordId: string) => void;
}) {
  const [card, setCard] = useState<Card>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const preferredWordIdRef = useRef<string | null>(preferredWordId ?? null);

  const [allTags, setAllTags] = useState<string[]>([]);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [appliedTags, setAppliedTags] = useState<string[]>([]);

  const canSpeak = mobileSpeechService.canSpeak();

  useEffect(() => {
    studyService.getAllTags().then(setAllTags).catch(() => {});
  }, [studyService]);

  const loadNext = useCallback(async () => {
    setLoading(true);
    setRevealed(false);
    try {
      const preferred = preferredWordIdRef.current;
      const next = await studyService.fetchNextCard(appliedTags.length ? appliedTags : undefined, preferred);
      if (preferred) {
        preferredWordIdRef.current = null;
      }
      setCard(next);
    } finally {
      setLoading(false);
    }
  }, [studyService, appliedTags]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  const grade = async (rating: Rating) => {
    if (!card) return;
    await studyService.gradeCard(card.word.id, rating);
    await loadNext();
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

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f8f9fa" }}>
        <Ionicons name="school-outline" size={40} color="#adb5bd" />
        <Text style={{ fontSize: 15, color: "#6c757d", marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

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
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#212529" }}>Study</Text>

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
      {showTagPanel && (
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
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#dee2e6",
                backgroundColor: pressed ? "#f1f3f5" : "#fff",
                alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#6c757d" }}>Clear</Text>
            </Pressable>
            <Pressable
              onPress={applyTagFilter}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: pressed ? "#0b5ed7" : "#0d6efd",
                alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>Apply</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* No card state */}
      {!card ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
          <Ionicons name="checkmark-circle-outline" size={56} color="#2b8a3e" />
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#212529", textAlign: "center" }}>All done!</Text>
          <Text style={{ fontSize: 15, color: "#6c757d", textAlign: "center" }}>
            {appliedTags.length > 0
              ? "No cards due for the selected tags."
              : "No cards due. Add new words or come back later."}
          </Text>
          <Pressable
            onPress={() => void loadNext()}
            style={({ pressed }) => ({
              marginTop: 8,
              backgroundColor: pressed ? "#0b5ed7" : "#0d6efd",
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 24,
            })}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Review All</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, gap: 16, flexGrow: 1 }}
          alwaysBounceVertical={false}
        >
          {/* Flash Card */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "#e9ecef",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: "#f1f3f5",
                backgroundColor: "#fafafa",
              }}
            >
              {(() => {
                const info = getMemoryInfo(card.memory.memoryLevel);
                return (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ backgroundColor: info.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: info.color }}>{info.label}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: "#adb5bd" }}>Lv.{card.memory.memoryLevel}</Text>
                  </View>
                );
              })()}
              {canSpeak && (
                <Pressable
                  onPress={() => mobileSpeechService.speakEnglish(card.word.headword)}
                  style={({ pressed }) => ({
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: pressed ? "#e7f1ff" : "#f1f3f5",
                    alignItems: "center",
                    justifyContent: "center",
                  })}
                >
                  <Ionicons name="volume-high-outline" size={18} color="#495057" />
                </Pressable>
              )}
            </View>

            <View style={{ padding: 28, alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 34, fontWeight: "800", color: "#212529", textAlign: "center" }}>
                {card.word.headword}
              </Text>
              <View style={{ backgroundColor: "#e7f1ff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#0d6efd" }}>{card.word.pos}</Text>
              </View>

              <View style={{ width: "60%", height: 1, backgroundColor: "#e9ecef", marginVertical: 4 }} />

              {revealed ? (
                <View style={{ alignItems: "center", gap: 10, width: "100%" }}>
                  <Text style={{ fontSize: 22, fontWeight: "700", color: "#198754", textAlign: "center" }}>
                    {card.word.meaningJa}
                  </Text>
                  {card.word.memo ? (
                    <Text style={{ fontSize: 14, color: "#6c757d", textAlign: "center", fontStyle: "italic" }}>
                      {card.word.memo}
                    </Text>
                  ) : null}
                  {card.word.tags.length > 0 && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                      {card.word.tags.map((tag) => (
                        <View key={tag} style={{ backgroundColor: "#f1f3f5", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 12, color: "#6c757d" }}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <Pressable
                  onPress={() => setRevealed(true)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? "#0b5ed7" : "#0d6efd",
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 32,
                    marginTop: 4,
                  })}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Show Answer</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Examples */}
          {revealed && card.word.examples.length > 0 && (
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#e9ecef",
                overflow: "hidden",
              }}
            >
              <View style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#fafafa", borderBottomWidth: 1, borderBottomColor: "#f1f3f5" }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#495057" }}>Examples</Text>
              </View>
              <View style={{ padding: 14, gap: 12 }}>
                {card.word.examples.map((ex) => (
                  <View key={ex.id} style={{ borderLeftWidth: 3, borderLeftColor: "#0d6efd", paddingLeft: 12, gap: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <Text style={{ fontSize: 14, color: "#212529", flex: 1, lineHeight: 20 }}>{ex.en}</Text>
                      {canSpeak && (
                        <Pressable
                          onPress={() => ex.en.trim() && mobileSpeechService.speakEnglish(ex.en)}
                          style={({ pressed }) => ({
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: pressed ? "#e7f1ff" : "#f1f3f5",
                            alignItems: "center",
                            justifyContent: "center",
                          })}
                        >
                          <Ionicons name="volume-high-outline" size={15} color="#495057" />
                        </Pressable>
                      )}
                    </View>
                    {ex.ja ? (
                      <Text style={{ fontSize: 13, color: "#6c757d" }}>{ex.ja}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Practice in Quiz button: only show if the word has examples */}
          {revealed && onNavigateToQuiz && card && card.word.examples.length > 0 && (
            <Pressable
              onPress={() => onNavigateToQuiz(card.word.id)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: "#0d6efd",
                backgroundColor: pressed ? "#e7f1ff" : "#fff",
              })}
            >
              <Ionicons name="pencil-outline" size={18} color="#0d6efd" />
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#0d6efd" }}>Practice in Quiz</Text>
            </Pressable>
          )}

          {/* Rating Buttons */}
          {revealed && (
            <View>
              <Text style={{ fontSize: 13, color: "#6c757d", textAlign: "center", marginBottom: 12 }}>
                How well did you remember?
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {RATINGS.map((r) => (
                  <Pressable
                    key={r.value}
                    onPress={() => void grade(r.value)}
                    style={({ pressed }) => ({
                      flex: 1,
                      backgroundColor: pressed ? r.color : r.bg,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: r.color,
                      paddingVertical: 12,
                      alignItems: "center",
                      gap: 4,
                    })}
                  >
                    <Ionicons name={r.icon} size={20} color={r.color} />
                    <Text style={{ fontSize: 11, fontWeight: "700", color: r.color }}>{r.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Due date info */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: "#e9ecef",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons name="calendar-outline" size={18} color="#6c757d" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: "#6c757d" }}>
                Due:{" "}
                {new Date(card.memory.dueAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {card.memory.reviewCount > 0 && (
                <Text style={{ fontSize: 12, color: "#adb5bd", marginTop: 2 }}>
                  Reviews: {card.memory.reviewCount}
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
