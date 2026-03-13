import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { AntDesign, FontAwesome6, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { Rating } from "../../../../src/api/types";
import type { MobileStudyService } from "../app/mobileServices";
import { mobileSpeechService } from "../app/mobileSpeechApplication";
import { useTheme } from "../app/ThemeContext";

type Card = Awaited<ReturnType<MobileStudyService["fetchNextCard"]>>;

export function StudyScreen({
  studyService,
  preferredWordId,
  onNavigateToQuiz,
}: {
  studyService: MobileStudyService;
  preferredWordId?: string | null;
  onNavigateToQuiz?: (wordId: string) => void;
}) {
  const { colors } = useTheme();
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

  const RATINGS: { value: Rating; label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: "again", label: "Again", icon: "refresh", color: colors.ratingAgain.color, bg: colors.ratingAgain.bg },
    { value: "hard", label: "Hard", icon: "hand-left-outline", color: colors.ratingHard.color, bg: colors.ratingHard.bg },
    { value: "good", label: "Good", icon: "thumbs-up-outline", color: colors.ratingGood.color, bg: colors.ratingGood.bg },
    { value: "easy", label: "Easy", icon: "flash-outline", color: colors.ratingEasy.color, bg: colors.ratingEasy.bg },
  ];

  function getMemoryInfo(level: number): { color: string; bg: string; label: string } {
    if (level === 0) return { ...colors.memNew, label: "New" };
    if (level <= 3) return { ...colors.memLearning, label: "Learning" };
    if (level <= 6) return { ...colors.memReview, label: "Review" };
    return { ...colors.memMastered, label: "Mastered" };
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <MaterialCommunityIcons name="card-multiple-outline" size={40} color={colors.textMuted} />
        <Text style={{ fontSize: 15, color: colors.textSub, marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

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
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>Study</Text>

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
      {showTagPanel && (
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
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.borderMid,
                backgroundColor: pressed ? colors.surfacePressed : colors.surface,
                alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textSub }}>Clear</Text>
            </Pressable>
            <Pressable
              onPress={applyTagFilter}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: pressed ? colors.primaryPressed : colors.primary,
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
          <Ionicons name="checkmark-circle-outline" size={56} color={colors.memMastered.color} />
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text, textAlign: "center" }}>All done!</Text>
          <Text style={{ fontSize: 15, color: colors.textSub, textAlign: "center" }}>
            {appliedTags.length > 0
              ? "No cards due for the selected tags."
              : "No cards due. Add new words or come back later."}
          </Text>
          <Pressable
            onPress={() => void loadNext()}
            style={({ pressed }) => ({
              marginTop: 8,
              backgroundColor: pressed ? colors.primaryPressed : colors.primary,
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
              backgroundColor: colors.surface,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.border,
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
                borderBottomColor: colors.borderLight,
                backgroundColor: colors.surfaceAlt,
              }}
            >
              {(() => {
                const info = getMemoryInfo(card.memory.memoryLevel);
                return (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ backgroundColor: info.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: info.color }}>{info.label}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>Lv.{card.memory.memoryLevel}</Text>
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
                    backgroundColor: pressed ? colors.primaryBg : colors.surfacePressed,
                    alignItems: "center",
                    justifyContent: "center",
                  })}
                >
                  <Ionicons name="volume-high-outline" size={18} color={colors.textDim} />
                </Pressable>
              )}
            </View>

            <View style={{ padding: 28, alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 34, fontWeight: "800", color: colors.text, textAlign: "center" }}>
                {card.word.headword}
              </Text>
              <View style={{ backgroundColor: colors.primaryBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>{card.word.pos}</Text>
              </View>

              <View style={{ width: "60%", height: 1, backgroundColor: colors.border, marginVertical: 4 }} />

              {revealed ? (
                <View style={{ alignItems: "center", gap: 10, width: "100%" }}>
                  <Text style={{ fontSize: 22, fontWeight: "700", color: colors.memMastered.color, textAlign: "center" }}>
                    {card.word.meaningJa}
                  </Text>
                  {card.word.memo ? (
                    <Text style={{ fontSize: 14, color: colors.textSub, textAlign: "center", fontStyle: "italic" }}>
                      {card.word.memo}
                    </Text>
                  ) : null}
                  {card.word.tags.length > 0 && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                      {card.word.tags.map((tag) => (
                        <View key={tag} style={{ backgroundColor: colors.surfacePressed, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 12, color: colors.textSub }}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <Pressable
                  onPress={() => setRevealed(true)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? colors.primaryPressed : colors.primary,
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
                backgroundColor: colors.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: "hidden",
              }}
            >
              <View style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surfaceAlt, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textDim }}>Examples</Text>
              </View>
              <View style={{ padding: 14, gap: 12 }}>
                {card.word.examples.map((ex) => (
                  <View key={ex.id} style={{ borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 12, gap: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <Text style={{ fontSize: 14, color: colors.text, flex: 1, lineHeight: 20 }}>{ex.en}</Text>
                      {canSpeak && (
                        <Pressable
                          onPress={() => ex.en.trim() && mobileSpeechService.speakEnglish(ex.en)}
                          style={({ pressed }) => ({
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: pressed ? colors.primaryBg : colors.surfacePressed,
                            alignItems: "center",
                            justifyContent: "center",
                          })}
                        >
                          <Ionicons name="volume-high-outline" size={15} color={colors.textDim} />
                        </Pressable>
                      )}
                    </View>
                    {ex.ja ? (
                      <Text style={{ fontSize: 13, color: colors.textSub }}>{ex.ja}</Text>
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
                borderColor: colors.primary,
                backgroundColor: pressed ? colors.primaryBg : colors.surface,
              })}
            >
              <AntDesign name="form" size={18} color={colors.primary} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>Practice in Fill</Text>
            </Pressable>
          )}

          {/* Rating Buttons */}
          {revealed && (
            <View>
              <Text style={{ fontSize: 13, color: colors.textSub, textAlign: "center", marginBottom: 12 }}>
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
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.textSub} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.textSub }}>
                Due:{" "}
                {new Date(card.memory.dueAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {card.memory.reviewCount > 0 && (
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
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
