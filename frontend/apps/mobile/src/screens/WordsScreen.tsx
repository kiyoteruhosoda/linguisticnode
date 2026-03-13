import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BackHandler,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MemoryState, Pos } from "../../../../src/api/types";
import type { WordDraft } from "../../../../src/core/word/wordGateway";
import type { MobileWordService } from "../app/mobileServices";
import { mobileSpeechService } from "../app/mobileSpeechApplication";
import { useTheme } from "../app/ThemeContext";

type WordItem = Awaited<ReturnType<MobileWordService["listWords"]>>["items"][number];
type SubRoute = "list" | "create" | "edit";

const POS_OPTIONS: Pos[] = ["noun", "verb", "adj", "adv", "prep", "conj", "pron", "det", "interj", "other"];

const EMPTY_DRAFT: WordDraft = {
  headword: "",
  pronunciation: "",
  pos: "noun",
  meaningJa: "",
  examples: [],
  tags: [],
  memo: "",
};

// ─── WordsScreen (root) ───────────────────────────────────────────────────────

export function WordsScreen({ service }: { service: MobileWordService }) {
  const [subRoute, setSubRoute] = useState<SubRoute>("list");
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [words, setWords] = useState<WordItem[]>([]);
  const [memoryMap, setMemoryMap] = useState<Record<string, MemoryState>>({});
  const [selectedWord, setSelectedWord] = useState<WordItem | null>(null);
  const [draft, setDraft] = useState<WordDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tag filter state
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [appliedTags, setAppliedTags] = useState<string[]>([]);

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Android back button: selection mode → exit selection; edit/create → go back to list
  useEffect(() => {
    if (!selectionMode) return;
    const onBackPress = () => {
      setSelectionMode(false);
      setSelectedIds([]);
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [selectionMode]);

  useEffect(() => {
    if (subRoute === "list") return;
    const onBackPress = () => {
      setSubRoute("list");
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [subRoute]);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const listed = await service.listWords({ q: query, tags: appliedTags.length ? appliedTags : undefined });
      setWords(listed.items);
      setMemoryMap(listed.memoryMap);
    } finally {
      setBusy(false);
    }
  }, [query, appliedTags, service]);

  useEffect(() => {
    void load();
    service.getAllTags().then(setAllTags).catch(() => {});
  }, [load, service]);

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

  const openCreate = () => {
    setDraft(EMPTY_DRAFT);
    setErrorMsg(null);
    setSubRoute("create");
  };

  const openEdit = (word: WordItem) => {
    setSelectedWord(word);
    setDraft({
      headword: word.headword,
      pronunciation: word.pronunciation ?? "",
      pos: word.pos,
      meaningJa: word.meaningJa,
      examples: word.examples,
      tags: word.tags,
      memo: word.memo ?? "",
    });
    setErrorMsg(null);
    setSubRoute("edit");
  };

  const submitCreate = async () => {
    if (!draft.headword.trim() || !draft.meaningJa.trim()) {
      setErrorMsg("Headword and meaning are required");
      return;
    }
    Keyboard.dismiss();
    setBusy(true);
    setErrorMsg(null);
    try {
      await service.createWord({ ...draft, headword: draft.headword.trim(), meaningJa: draft.meaningJa.trim() });
      await load();
      setSubRoute("list");
    } catch {
      setErrorMsg("Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const submitUpdate = async () => {
    if (!selectedWord) return;
    Keyboard.dismiss();
    setBusy(true);
    setErrorMsg(null);
    try {
      await service.updateWord(selectedWord.id, draft);
      await load();
      setSubRoute("list");
    } catch {
      setErrorMsg("Failed to update");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedWord) return;
    setBusy(true);
    try {
      await service.deleteWord(selectedWord.id);
      await load();
      setSubRoute("list");
    } catch {
      setErrorMsg("Failed to delete");
    } finally {
      setBusy(false);
    }
  };

  const handleResetMemory = async () => {
    if (!selectedWord) return;
    setBusy(true);
    try {
      await service.resetWordMemory(selectedWord.id);
      setErrorMsg(null);
      await load();
      setSubRoute("list");
    } catch {
      setErrorMsg("Failed to reset");
    } finally {
      setBusy(false);
    }
  };

  // Bulk handlers
  const handleBulkDelete = async () => {
    setBusy(true);
    try {
      for (const id of selectedIds) {
        await service.deleteWord(id);
      }
      await load();
      setSelectionMode(false);
      setSelectedIds([]);
    } catch {
      setErrorMsg("Failed to delete some words");
    } finally {
      setBusy(false);
    }
  };

  const handleBulkResetMemory = async () => {
    setBusy(true);
    try {
      for (const id of selectedIds) {
        await service.resetWordMemory(id);
      }
      await load();
      setSelectionMode(false);
      setSelectedIds([]);
    } catch {
      setErrorMsg("Failed to reset some words");
    } finally {
      setBusy(false);
    }
  };

  const handleBulkChangeTags = async (newTags: string[], mode: "add" | "replace") => {
    setBusy(true);
    try {
      for (const id of selectedIds) {
        const word = words.find((w) => w.id === id);
        if (!word) continue;
        const tags = mode === "replace" ? newTags : [...new Set([...word.tags, ...newTags])];
        await service.updateWord(id, {
          headword: word.headword,
          pronunciation: word.pronunciation ?? "",
          pos: word.pos,
          meaningJa: word.meaningJa,
          examples: word.examples,
          tags,
          memo: word.memo ?? "",
        });
      }
      await load();
      setSelectionMode(false);
      setSelectedIds([]);
    } catch {
      setErrorMsg("Failed to update tags for some words");
    } finally {
      setBusy(false);
    }
  };

  if (subRoute === "create" || subRoute === "edit") {
    return (
      <WordFormView
        mode={subRoute}
        draft={draft}
        onChangeDraft={setDraft}
        onSubmit={subRoute === "create" ? submitCreate : submitUpdate}
        onBack={() => setSubRoute("list")}
        onDelete={subRoute === "edit" ? handleDelete : undefined}
        onResetMemory={subRoute === "edit" ? handleResetMemory : undefined}
        busy={busy}
        errorMsg={errorMsg}
      />
    );
  }

  return (
    <WordListView
      words={words}
      memoryMap={memoryMap}
      query={query}
      showSearch={showSearch}
      allTags={allTags}
      showTagPanel={showTagPanel}
      selectedTags={selectedTags}
      appliedTags={appliedTags}
      busy={busy}
      selectionMode={selectionMode}
      selectedIds={selectedIds}
      onQueryChange={setQuery}
      onToggleSearch={() => {
        setShowSearch((v) => !v);
        if (showSearch) setQuery("");
      }}
      onToggleTagPanel={() => {
        setSelectedTags([...appliedTags]);
        setShowTagPanel((v) => !v);
      }}
      onToggleTag={toggleTag}
      onApplyTags={applyTagFilter}
      onClearTags={clearTagFilter}
      onSelectWord={openEdit}
      onAdd={openCreate}
      onLongPressWord={(wordId) => {
        setSelectionMode(true);
        setSelectedIds([wordId]);
      }}
      onToggleSelection={(wordId) => {
        setSelectedIds((prev) =>
          prev.includes(wordId) ? prev.filter((id) => id !== wordId) : [...prev, wordId],
        );
      }}
      onCancelSelection={() => {
        setSelectionMode(false);
        setSelectedIds([]);
      }}
      onSelectAll={() => setSelectedIds(words.map((w) => w.id))}
      onBulkDelete={() => void handleBulkDelete()}
      onBulkResetMemory={() => void handleBulkResetMemory()}
      onBulkChangeTags={(tags, mode) => void handleBulkChangeTags(tags, mode)}
    />
  );
}

// ─── Word List View ───────────────────────────────────────────────────────────

function WordListView({
  words,
  memoryMap,
  query,
  showSearch,
  allTags,
  showTagPanel,
  selectedTags,
  appliedTags,
  busy,
  selectionMode,
  selectedIds,
  onQueryChange,
  onToggleSearch,
  onToggleTagPanel,
  onToggleTag,
  onApplyTags,
  onClearTags,
  onSelectWord,
  onAdd,
  onLongPressWord,
  onToggleSelection,
  onCancelSelection,
  onSelectAll,
  onBulkDelete,
  onBulkResetMemory,
  onBulkChangeTags,
}: {
  words: WordItem[];
  memoryMap: Record<string, MemoryState>;
  query: string;
  showSearch: boolean;
  allTags: string[];
  showTagPanel: boolean;
  selectedTags: string[];
  appliedTags: string[];
  busy: boolean;
  selectionMode: boolean;
  selectedIds: string[];
  onQueryChange: (q: string) => void;
  onToggleSearch: () => void;
  onToggleTagPanel: () => void;
  onToggleTag: (tag: string) => void;
  onApplyTags: () => void;
  onClearTags: () => void;
  onSelectWord: (w: WordItem) => void;
  onAdd: () => void;
  onLongPressWord: (wordId: string) => void;
  onToggleSelection: (wordId: string) => void;
  onCancelSelection: () => void;
  onSelectAll: () => void;
  onBulkDelete: () => void;
  onBulkResetMemory: () => void;
  onBulkChangeTags: (tags: string[], mode: "add" | "replace") => void;
}) {
  const { colors } = useTheme();
  const [bulkConfirm, setBulkConfirm] = useState<"delete" | "reset" | null>(null);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tagMode, setTagMode] = useState<"add" | "replace">("add");

  function getMemoryInfo(level: number): { color: string; bg: string; label: string } {
    if (level === 0) return { ...colors.memNew, label: "New" };
    if (level <= 3) return { ...colors.memLearning, label: "Learning" };
    if (level <= 6) return { ...colors.memReview, label: "Review" };
    return { ...colors.memMastered, label: "Mastered" };
  }

  const handleBulkConfirm = () => {
    if (bulkConfirm === "delete") onBulkDelete();
    if (bulkConfirm === "reset") onBulkResetMemory();
    setBulkConfirm(null);
  };

  const handleApplyTags = () => {
    const tags = tagInput.split(",").map((t) => t.trim()).filter(Boolean);
    onBulkChangeTags(tags, tagMode);
    setShowTagModal(false);
    setTagInput("");
    setTagMode("add");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {selectionMode ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
              {selectedIds.length} selected
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={onSelectAll}
                style={({ pressed }) => ({
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: pressed ? colors.primaryBg : colors.surfacePressed,
                })}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>All</Text>
              </Pressable>
              <Pressable
                onPress={onCancelSelection}
                style={({ pressed }) => ({
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: pressed ? colors.surfacePressed : colors.surface,
                  borderWidth: 1,
                  borderColor: colors.borderMid,
                })}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textDim }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>Words</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {allTags.length > 0 && (
                <Pressable
                  onPress={onToggleTagPanel}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: appliedTags.length > 0 ? colors.primaryBg : colors.surfacePressed,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: appliedTags.length > 0 ? 1 : 0,
                    borderColor: colors.primary,
                  }}
                >
                  <Ionicons name="pricetag-outline" size={17} color={appliedTags.length > 0 ? colors.primary : colors.textDim} />
                </Pressable>
              )}
              <Pressable
                onPress={onToggleSearch}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: showSearch ? colors.primaryBg : colors.surfacePressed,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={showSearch ? "close" : "search"} size={18} color={showSearch ? colors.primary : colors.textDim} />
              </Pressable>
            </View>
          </View>
        )}

        {!selectionMode && showSearch && (
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder="Search words"
            placeholderTextColor={colors.textMuted}
            autoFocus
            style={{
              marginTop: 10,
              borderWidth: 1,
              borderColor: colors.borderMid,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 9,
              fontSize: 15,
              backgroundColor: colors.bg,
              color: colors.text,
            }}
          />
        )}
      </View>

      {/* Tag Filter Panel */}
      {!selectionMode && showTagPanel && allTags.length > 0 && (
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
                onPress={() => onToggleTag(tag)}
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
              onPress={onClearTags}
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
              onPress={onApplyTags}
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

      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={{ fontSize: 13, color: colors.textSub }}>
          {busy ? "Loading..." : `${words.length} word${words.length !== 1 ? "s" : ""}`}
        </Text>
      </View>

      {words.length === 0 && !busy ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 80 }}>
          <Ionicons name="file-tray-outline" size={48} color={colors.textMuted} />
          <Text style={{ fontSize: 15, color: colors.textSub }}>No words yet</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>Tap + to add your first word</Text>
        </View>
      ) : (
        <FlatList
          data={words}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, paddingBottom: selectionMode ? 80 : 96, gap: 8 }}
          renderItem={({ item }) => {
            const memory = memoryMap[item.id];
            const memInfo = memory ? getMemoryInfo(memory.memoryLevel) : null;
            const isSelected = selectedIds.includes(item.id);
            return (
              <Pressable
                onPress={() => {
                  if (selectionMode) {
                    onToggleSelection(item.id);
                  } else {
                    onSelectWord(item);
                  }
                }}
                onLongPress={() => onLongPressWord(item.id)}
                delayLongPress={400}
                style={({ pressed }) => ({
                  backgroundColor: isSelected ? colors.primaryBg : pressed ? colors.primaryBg : colors.surface,
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? colors.primary : colors.border,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 2,
                  elevation: 1,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                  {selectionMode && (
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: isSelected ? colors.primary : colors.textMuted,
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                        marginTop: 1,
                      }}
                    >
                      {isSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>{item.headword}</Text>
                    <Text style={{ fontSize: 15, color: colors.textDim, marginTop: 4 }}>{item.meaningJa}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <PosBadge pos={item.pos} />
                    {memInfo && (
                      <View style={{ backgroundColor: memInfo.bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, fontWeight: "600", color: memInfo.color }}>{memInfo.label}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  {item.tags.length > 0 ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, flex: 1 }}>
                      {item.tags.map((tag) => (
                        <View key={tag} style={{ backgroundColor: colors.surfacePressed, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11, color: colors.textSub }}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : <View style={{ flex: 1 }} />}
                  {item.examples.length > 0 && (
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>{item.examples.length} example{item.examples.length !== 1 ? "s" : ""}</Text>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* FAB (normal mode only) */}
      {!selectionMode && (
        <Pressable
          onPress={onAdd}
          style={({ pressed }) => ({
            position: "absolute",
            bottom: 24,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: pressed ? colors.primaryPressed : colors.primary,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 6,
          })}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </Pressable>
      )}

      {/* Bulk Action Bar (selection mode only) */}
      {selectionMode && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            flexDirection: "row",
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingVertical: 10,
            paddingHorizontal: 12,
            gap: 8,
          }}
        >
          <Pressable
            onPress={() => {
              setTagInput("");
              setTagMode("add");
              setShowTagModal(true);
            }}
            disabled={selectedIds.length === 0 || busy}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: selectedIds.length === 0 ? colors.borderMid : colors.primary,
              backgroundColor: pressed && selectedIds.length > 0 ? colors.primaryBg : colors.surface,
              alignItems: "center",
              gap: 4,
            })}
          >
            <Ionicons name="pricetag-outline" size={18} color={selectedIds.length === 0 ? colors.textMuted : colors.primary} />
            <Text style={{ fontSize: 11, fontWeight: "600", color: selectedIds.length === 0 ? colors.textMuted : colors.primary }}>Tags</Text>
          </Pressable>
          <Pressable
            onPress={() => setBulkConfirm("reset")}
            disabled={selectedIds.length === 0 || busy}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: selectedIds.length === 0 ? colors.borderMid : colors.ratingHard.color,
              backgroundColor: pressed && selectedIds.length > 0 ? colors.ratingHard.bg : colors.surface,
              alignItems: "center",
              gap: 4,
            })}
          >
            <Ionicons name="refresh-outline" size={18} color={selectedIds.length === 0 ? colors.textMuted : colors.ratingHard.color} />
            <Text style={{ fontSize: 11, fontWeight: "600", color: selectedIds.length === 0 ? colors.textMuted : colors.ratingHard.color }}>Reset</Text>
          </Pressable>
          <Pressable
            onPress={() => setBulkConfirm("delete")}
            disabled={selectedIds.length === 0 || busy}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: selectedIds.length === 0 ? colors.borderMid : colors.ratingAgain.color,
              backgroundColor: pressed && selectedIds.length > 0 ? colors.ratingAgain.bg : colors.surface,
              alignItems: "center",
              gap: 4,
            })}
          >
            <Ionicons name="trash-outline" size={18} color={selectedIds.length === 0 ? colors.textMuted : colors.ratingAgain.color} />
            <Text style={{ fontSize: 11, fontWeight: "600", color: selectedIds.length === 0 ? colors.textMuted : colors.ratingAgain.color }}>Delete</Text>
          </Pressable>
        </View>
      )}

      {/* Bulk confirm dialog */}
      <ConfirmModal
        visible={bulkConfirm !== null}
        title={bulkConfirm === "delete" ? `Delete ${selectedIds.length} word${selectedIds.length !== 1 ? "s" : ""}?` : `Reset memory for ${selectedIds.length} word${selectedIds.length !== 1 ? "s" : ""}?`}
        message={
          bulkConfirm === "delete"
            ? "This action cannot be undone."
            : "Learning progress for the selected words will be reset."
        }
        confirmLabel={bulkConfirm === "delete" ? "Delete" : "Reset"}
        confirmColor={bulkConfirm === "delete" ? colors.ratingAgain.color : colors.ratingHard.color}
        onConfirm={handleBulkConfirm}
        onCancel={() => setBulkConfirm(null)}
      />

      {/* Tag modal */}
      <Modal visible={showTagModal} transparent animationType="slide" onRequestClose={() => setShowTagModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              gap: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
                Change Tags ({selectedIds.length} words)
              </Text>
              <Pressable onPress={() => setShowTagModal(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.textSub} />
              </Pressable>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSub }}>Mode</Text>
              {(["add", "replace"] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setTagMode(m)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: tagMode === m ? colors.primary : colors.borderMid,
                    backgroundColor: tagMode === m ? colors.primaryBg : colors.bg,
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      borderWidth: 2,
                      borderColor: tagMode === m ? colors.primary : colors.textMuted,
                      backgroundColor: tagMode === m ? colors.primary : colors.surface,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {tagMode === m && <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#fff" }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
                      {m === "add" ? "Add tags" : "Replace tags"}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 2 }}>
                      {m === "add" ? "Add to existing tags" : "Replace all existing tags"}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSub, marginBottom: 6 }}>
                Tags (comma-separated)
              </Text>
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="e.g. TOEFL, important"
                placeholderTextColor={colors.textMuted}
                style={{
                  borderWidth: 1,
                  borderColor: colors.borderMid,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 15,
                  color: colors.text,
                  backgroundColor: colors.bg,
                }}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setShowTagModal(false)}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.borderMid,
                  backgroundColor: pressed ? colors.surfacePressed : colors.surface,
                  alignItems: "center",
                })}
              >
                <Text style={{ fontWeight: "600", color: colors.textDim }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleApplyTags}
                style={({ pressed }) => ({
                  flex: 2,
                  paddingVertical: 13,
                  borderRadius: 10,
                  backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                  alignItems: "center",
                })}
              >
                <Text style={{ fontWeight: "700", color: "#fff" }}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Word Form View ───────────────────────────────────────────────────────────

type DraftExample = { id: string; en: string; ja: string };

function WordFormView({
  mode,
  draft,
  onChangeDraft,
  onSubmit,
  onBack,
  onDelete,
  onResetMemory,
  busy,
  errorMsg,
}: {
  mode: "create" | "edit";
  draft: WordDraft;
  onChangeDraft: (d: WordDraft) => void;
  onSubmit: () => void;
  onBack: () => void;
  onDelete?: () => void;
  onResetMemory?: () => void;
  busy: boolean;
  errorMsg: string | null;
}) {
  const { colors } = useTheme();
  const [confirmAction, setConfirmAction] = useState<"delete" | "reset" | null>(null);
  const canSpeak = mobileSpeechService.canSpeak();

  const labelStyle = {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.textSub,
    marginBottom: 4,
  };

  const fieldInputStyle = {
    fontSize: 15,
    color: colors.text,
    paddingVertical: 2,
  };

  const set = <K extends keyof WordDraft>(key: K, value: WordDraft[K]) =>
    onChangeDraft({ ...draft, [key]: value });

  const isValid = useMemo(() => draft.headword.trim() && draft.meaningJa.trim(), [draft]);

  const draftExamples: DraftExample[] = (draft.examples ?? []).map((e) => ({
    id: e.id,
    en: e.en,
    ja: e.ja ?? "",
  }));

  const addExample = () => {
    const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set("examples", [...(draft.examples ?? []), { id: newId, en: "", ja: "" }]);
  };

  const updateExample = (id: string, field: "en" | "ja", value: string) => {
    set(
      "examples",
      (draft.examples ?? []).map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );
  };

  const removeExample = (id: string) => {
    set("examples", (draft.examples ?? []).filter((e) => e.id !== id));
  };

  const handleConfirm = () => {
    if (confirmAction === "delete") onDelete?.();
    if (confirmAction === "reset") onResetMemory?.();
    setConfirmAction(null);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
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
          gap: 12,
        }}
      >
        <Pressable onPress={onBack} hitSlop={8} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, flex: 1 }}>
          {mode === "create" ? "Add Word" : "Edit Word"}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {errorMsg ? (
          <View style={{ backgroundColor: colors.ratingAgain.bg, borderWidth: 1, borderColor: colors.ratingAgain.color, borderRadius: 10, padding: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="warning-outline" size={16} color={colors.ratingAgain.color} />
              <Text style={{ color: colors.ratingAgain.color, fontSize: 14 }}>{errorMsg}</Text>
            </View>
          </View>
        ) : null}

        {/* Required Fields */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
          {/* Headword + Speak */}
          <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={labelStyle}>Headword *</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TextInput
                value={draft.headword}
                onChangeText={(v) => set("headword", v)}
                placeholder="e.g. ephemeral"
                placeholderTextColor={colors.textMuted}
                style={[fieldInputStyle, { flex: 1 }]}
              />
              {canSpeak && (
                <Pressable
                  onPress={() => draft.headword.trim() && mobileSpeechService.speakEnglish(draft.headword)}
                  disabled={!draft.headword.trim()}
                  style={({ pressed }) => ({
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: !draft.headword.trim() ? colors.surfacePressed : pressed ? colors.primaryBg : colors.bg,
                    borderWidth: 1,
                    borderColor: !draft.headword.trim() ? colors.borderMid : colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  })}
                >
                  <Ionicons name="volume-high-outline" size={18} color={!draft.headword.trim() ? colors.textMuted : colors.primary} />
                </Pressable>
              )}
            </View>
          </View>
          <Divider colors={colors} />
          <FieldRow label="Meaning (JA) *" labelStyle={labelStyle}>
            <TextInput
              value={draft.meaningJa}
              onChangeText={(v) => set("meaningJa", v)}
              placeholder="e.g. 短命の、はかない"
              placeholderTextColor={colors.textMuted}
              style={fieldInputStyle}
            />
          </FieldRow>
        </View>

        {/* POS Selector */}
        <View>
          <Text style={[labelStyle, { marginBottom: 8 }]}>Part of Speech</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {POS_OPTIONS.map((pos) => (
              <Pressable
                key={pos}
                onPress={() => set("pos", pos)}
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: draft.pos === pos ? colors.primary : colors.borderMid,
                  backgroundColor: draft.pos === pos ? colors.primaryBg : colors.surface,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: draft.pos === pos ? "700" : "400", color: draft.pos === pos ? colors.primary : colors.textDim }}>
                  {pos}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Tags + Memo */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
          <FieldRow label="Tags (comma-separated)" labelStyle={labelStyle}>
            <TextInput
              value={(draft.tags ?? []).join(", ")}
              onChangeText={(v) => set("tags", v.split(",").map((t) => t.trim()).filter(Boolean))}
              placeholder="e.g. TOEFL, important"
              placeholderTextColor={colors.textMuted}
              style={fieldInputStyle}
            />
          </FieldRow>
          <Divider colors={colors} />
          <FieldRow label="Memo" labelStyle={labelStyle}>
            <TextInput
              value={draft.memo ?? ""}
              onChangeText={(v) => set("memo", v)}
              placeholder="Optional note"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
              style={[fieldInputStyle, { minHeight: 44 }]}
            />
          </FieldRow>
        </View>

        {/* Examples Section */}
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={[labelStyle]}>Examples ({draftExamples.length})</Text>
            <Pressable
              onPress={addExample}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.primary,
                backgroundColor: pressed ? colors.primaryBg : colors.surface,
              })}
            >
              <Text style={{ fontSize: 14, color: colors.primary, fontWeight: "700" }}>+ Add</Text>
            </Pressable>
          </View>

          {draftExamples.length === 0 ? (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, alignItems: "center" }}>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>No examples yet</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {draftExamples.map((ex, index) => (
                <View
                  key={ex.id}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    overflow: "hidden",
                  }}
                >
                  {/* Example header */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSub }}>Example {index + 1}</Text>
                    <Pressable
                      onPress={() => removeExample(ex.id)}
                      hitSlop={8}
                    >
                      <Text style={{ fontSize: 13, color: colors.ratingAgain.color, fontWeight: "600" }}>Remove</Text>
                    </Pressable>
                  </View>

                  {/* English */}
                  <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
                    <Text style={labelStyle}>English</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <TextInput
                        value={ex.en}
                        onChangeText={(v) => updateExample(ex.id, "en", v)}
                        placeholder="English sentence"
                        placeholderTextColor={colors.textMuted}
                        style={[fieldInputStyle, { flex: 1 }]}
                      />
                      {canSpeak && (
                        <Pressable
                          onPress={() => ex.en.trim() && mobileSpeechService.speakEnglish(ex.en)}
                          disabled={!ex.en.trim()}
                          style={({ pressed }) => ({
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: !ex.en.trim() ? colors.surfacePressed : pressed ? colors.primaryBg : colors.bg,
                            borderWidth: 1,
                            borderColor: !ex.en.trim() ? colors.borderMid : colors.primary,
                            alignItems: "center",
                            justifyContent: "center",
                          })}
                        >
                          <Ionicons name="volume-high-outline" size={16} color={!ex.en.trim() ? colors.textMuted : colors.primary} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                  <Divider colors={colors} />
                  {/* Japanese */}
                  <FieldRow label="Japanese (optional)" labelStyle={labelStyle}>
                    <TextInput
                      value={ex.ja}
                      onChangeText={(v) => updateExample(ex.id, "ja", v)}
                      placeholder="Japanese translation"
                      placeholderTextColor={colors.textMuted}
                      style={fieldInputStyle}
                    />
                  </FieldRow>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submit */}
        <Pressable
          onPress={() => void onSubmit()}
          disabled={busy || !isValid}
          style={({ pressed }) => ({
            backgroundColor: busy || !isValid ? colors.primaryBg : pressed ? colors.primaryPressed : colors.primary,
            borderRadius: 12,
            paddingVertical: 15,
            alignItems: "center",
          })}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
            {busy ? "Saving..." : mode === "create" ? "Add Word" : "Update"}
          </Text>
        </Pressable>

        {/* Danger Zone (edit only) */}
        {mode === "edit" && (
          <View style={{ gap: 10 }}>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: "center" }}>Danger Zone</Text>

            <Pressable
              onPress={() => setConfirmAction("reset")}
              disabled={busy}
              style={({ pressed }) => ({
                borderRadius: 12,
                paddingVertical: 13,
                alignItems: "center",
                borderWidth: 1.5,
                borderColor: colors.ratingHard.color,
                backgroundColor: pressed ? colors.ratingHard.bg : colors.surface,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="refresh-outline" size={18} color={colors.ratingHard.color} />
                <Text style={{ color: colors.ratingHard.color, fontWeight: "700", fontSize: 15 }}>Reset Memory</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setConfirmAction("delete")}
              disabled={busy}
              style={({ pressed }) => ({
                borderRadius: 12,
                paddingVertical: 13,
                alignItems: "center",
                borderWidth: 1.5,
                borderColor: colors.ratingAgain.color,
                backgroundColor: pressed ? colors.ratingAgain.bg : colors.surface,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="trash-outline" size={18} color={colors.ratingAgain.color} />
                <Text style={{ color: colors.ratingAgain.color, fontWeight: "700", fontSize: 15 }}>Delete Word</Text>
              </View>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Confirm Dialog */}
      <ConfirmModal
        visible={confirmAction !== null}
        title={confirmAction === "delete" ? "Delete this word?" : "Reset memory?"}
        message={
          confirmAction === "delete"
            ? "This action cannot be undone."
            : "Learning progress for this word will be reset."
        }
        confirmLabel={confirmAction === "delete" ? "Delete" : "Reset"}
        confirmColor={confirmAction === "delete" ? colors.ratingAgain.color : colors.ratingHard.color}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Small Components ─────────────────────────────────────────────────────────

function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, gap: 16 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>{title}</Text>
          <Text style={{ fontSize: 14, color: colors.textSub }}>{message}</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.borderMid,
                backgroundColor: pressed ? colors.surfacePressed : colors.surface,
                alignItems: "center",
              })}
            >
              <Text style={{ fontWeight: "600", color: colors.textDim }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: pressed ? "#000" : confirmColor,
                alignItems: "center",
              })}
            >
              <Text style={{ fontWeight: "700", color: "#fff" }}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// POS colors — semantic colors kept consistent in both light/dark
const POS_COLORS_LIGHT: Record<Pos, { bg: string; text: string }> = {
  noun: { bg: "#e7f5ff", text: "#1971c2" },
  verb: { bg: "#fff3bf", text: "#e67700" },
  adj: { bg: "#ebfbee", text: "#2b8a3e" },
  adv: { bg: "#f3f0ff", text: "#5f3dc4" },
  prep: { bg: "#fff0f6", text: "#a61e4d" },
  conj: { bg: "#fff4e6", text: "#d9480f" },
  pron: { bg: "#e3fafc", text: "#0c8599" },
  det: { bg: "#f8f9fa", text: "#495057" },
  interj: { bg: "#fce8ff", text: "#862e9c" },
  other: { bg: "#f1f3f5", text: "#495057" },
};

const POS_COLORS_DARK: Record<Pos, { bg: string; text: string }> = {
  noun: { bg: "#0d1f3d", text: "#74b4ff" },
  verb: { bg: "#3d2a00", text: "#ffc046" },
  adj: { bg: "#0d2f1a", text: "#5cd97d" },
  adv: { bg: "#1e1640", text: "#9d7fe8" },
  prep: { bg: "#2d0a1e", text: "#e8749a" },
  conj: { bg: "#2d1800", text: "#ffa040" },
  pron: { bg: "#0a2030", text: "#4dc8d4" },
  det: { bg: "#252c30", text: "#9ba5b0" },
  interj: { bg: "#2a0f2d", text: "#c97fd4" },
  other: { bg: "#252c30", text: "#9ba5b0" },
};

function PosBadge({ pos }: { pos: Pos }) {
  const { isDark } = useTheme();
  const palette = isDark ? POS_COLORS_DARK : POS_COLORS_LIGHT;
  const c = palette[pos] ?? (isDark ? { bg: "#252c30", text: "#9ba5b0" } : { bg: "#f1f3f5", text: "#495057" });
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: c.text }}>{pos}</Text>
    </View>
  );
}

function FieldRow({ label, children, labelStyle }: { label: string; children: ReactNode; labelStyle: object }) {
  return (
    <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
      <Text style={labelStyle}>{label}</Text>
      {children}
    </View>
  );
}

function Divider({ colors }: { colors: { borderLight: string } }) {
  return <View style={{ height: 1, backgroundColor: colors.borderLight }} />;
}
