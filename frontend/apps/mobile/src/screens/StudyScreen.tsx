import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { Rating } from "../../../../src/api/types";
import type { MobileStudyService } from "../app/mobileServices";
import { mobileSpeechService } from "../app/mobileSpeechApplication";

type Card = Awaited<ReturnType<MobileStudyService["fetchNextCard"]>>;

const RATINGS: { value: Rating; label: string; emoji: string; color: string; bg: string }[] = [
  { value: "again", label: "もう一度", emoji: "🔁", color: "#dc3545", bg: "#fff5f5" },
  { value: "hard", label: "難しい", emoji: "😓", color: "#fd7e14", bg: "#fff8f0" },
  { value: "good", label: "良い", emoji: "👍", color: "#198754", bg: "#f0fff4" },
  { value: "easy", label: "簡単", emoji: "⚡", color: "#0d6efd", bg: "#f0f8ff" },
];

function getMemoryInfo(level: number): { label: string; color: string; bg: string } {
  if (level === 0) return { label: "新規", color: "#6c757d", bg: "#f1f3f5" };
  if (level <= 3) return { label: "学習中", color: "#e67700", bg: "#fff3bf" };
  if (level <= 6) return { label: "復習", color: "#1971c2", bg: "#e7f5ff" };
  return { label: "定着", color: "#2b8a3e", bg: "#ebfbee" };
}

export function StudyScreen({ studyService }: { studyService: MobileStudyService }) {
  const [card, setCard] = useState<Card>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Tag filter state
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [appliedTags, setAppliedTags] = useState<string[]>([]);

  const canSpeak = mobileSpeechService.canSpeak();

  // Load available tags
  useEffect(() => {
    studyService.getAllTags().then(setAllTags).catch(() => {});
  }, [studyService]);

  const loadNext = useCallback(async () => {
    setLoading(true);
    setRevealed(false);
    try {
      const next = await studyService.fetchNextCard(appliedTags.length ? appliedTags : undefined);
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
        <Text style={{ fontSize: 32 }}>🧠</Text>
        <Text style={{ fontSize: 15, color: "#6c757d", marginTop: 8 }}>読み込み中...</Text>
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
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#212529" }}>学習</Text>

        {/* Tag filter button */}
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
            <Text style={{ fontSize: 14 }}>🏷️</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: appliedTags.length > 0 ? "#0d6efd" : "#495057" }}>
              {appliedTags.length > 0 ? `タグ (${appliedTags.length})` : "タグ"}
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
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#6c757d" }}>クリア</Text>
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
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>適用</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* No card state */}
      {!card ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
          <Text style={{ fontSize: 56 }}>🎉</Text>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#212529", textAlign: "center" }}>お疲れ様でした！</Text>
          <Text style={{ fontSize: 15, color: "#6c757d", textAlign: "center" }}>
            {appliedTags.length > 0
              ? "選択したタグの学習カードがありません。"
              : "学習するカードがありません。新しい単語を追加するか、あとでまた来てください。"}
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
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>再確認する</Text>
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
            {/* Card Header: memory level + speak */}
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
                  <Text style={{ fontSize: 16 }}>🔊</Text>
                </Pressable>
              )}
            </View>

            {/* Card Body */}
            <View style={{ padding: 28, alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 34, fontWeight: "800", color: "#212529", textAlign: "center" }}>
                {card.word.headword}
              </Text>
              {card.word.pronunciation ? (
                <Text style={{ fontSize: 16, color: "#6c757d", textAlign: "center" }}>{card.word.pronunciation}</Text>
              ) : null}
              <View style={{ backgroundColor: "#e7f1ff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#0d6efd" }}>{card.word.pos}</Text>
              </View>

              <View style={{ width: "60%", height: 1, backgroundColor: "#e9ecef", marginVertical: 4 }} />

              {/* Answer */}
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
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>答えを見る</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Examples (revealed) */}
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
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#495057" }}>例文</Text>
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
                          <Text style={{ fontSize: 13 }}>🔊</Text>
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

          {/* Rating Buttons (revealed) */}
          {revealed && (
            <View>
              <Text style={{ fontSize: 13, color: "#6c757d", textAlign: "center", marginBottom: 12 }}>
                どれくらい覚えていましたか？
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
                    <Text style={{ fontSize: 20 }}>{r.emoji}</Text>
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
            <Text style={{ fontSize: 16 }}>📊</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: "#6c757d" }}>
                復習予定:{" "}
                {new Date(card.memory.dueAt).toLocaleString("ja-JP", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {card.memory.reviewCount > 0 && (
                <Text style={{ fontSize: 12, color: "#adb5bd", marginTop: 2 }}>
                  復習回数: {card.memory.reviewCount} 回
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
