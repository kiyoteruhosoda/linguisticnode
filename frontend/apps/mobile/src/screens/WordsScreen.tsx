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

// ─── Memory level helpers ─────────────────────────────────────────────────────

function getMemoryInfo(level: number): { label: string; color: string; bg: string } {
  if (level === 0) return { label: "New", color: "#6c757d", bg: "#f1f3f5" };
  if (level <= 3) return { label: "Learning", color: "#e67700", bg: "#fff3bf" };
  if (level <= 6) return { label: "Review", color: "#1971c2", bg: "#e7f5ff" };
  return { label: "Mastered", color: "#2b8a3e", bg: "#ebfbee" };
}

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

  // Android back button: when on edit/create sub-route, go back to list
  // (App.tsx handles the root-level back; this runs first due to LIFO order)
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
  onQueryChange,
  onToggleSearch,
  onToggleTagPanel,
  onToggleTag,
  onApplyTags,
  onClearTags,
  onSelectWord,
  onAdd,
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
  onQueryChange: (q: string) => void;
  onToggleSearch: () => void;
  onToggleTagPanel: () => void;
  onToggleTag: (tag: string) => void;
  onApplyTags: () => void;
  onClearTags: () => void;
  onSelectWord: (w: WordItem) => void;
  onAdd: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "#fff",
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#e9ecef",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#212529" }}>Vocabulary</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {allTags.length > 0 && (
              <Pressable
                onPress={onToggleTagPanel}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: appliedTags.length > 0 ? "#e7f1ff" : "#f1f3f5",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: appliedTags.length > 0 ? 1 : 0,
                  borderColor: "#0d6efd",
                }}
              >
                <Ionicons name="pricetag-outline" size={17} color={appliedTags.length > 0 ? "#0d6efd" : "#495057"} />
              </Pressable>
            )}
            <Pressable
              onPress={onToggleSearch}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: showSearch ? "#e7f1ff" : "#f1f3f5",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={showSearch ? "close" : "search"} size={18} color={showSearch ? "#0d6efd" : "#495057"} />
            </Pressable>
          </View>
        </View>

        {showSearch && (
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder="Search words"
            placeholderTextColor="#adb5bd"
            autoFocus
            style={{
              marginTop: 10,
              borderWidth: 1,
              borderColor: "#dee2e6",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 9,
              fontSize: 15,
              backgroundColor: "#f8f9fa",
              color: "#212529",
            }}
          />
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
                onPress={() => onToggleTag(tag)}
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
              onPress={onClearTags}
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
              onPress={onApplyTags}
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

      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={{ fontSize: 13, color: "#6c757d" }}>
          {busy ? "Loading..." : `${words.length} word${words.length !== 1 ? "s" : ""}`}
        </Text>
      </View>

      {words.length === 0 && !busy ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 80 }}>
          <Ionicons name="file-tray-outline" size={48} color="#adb5bd" />
          <Text style={{ fontSize: 15, color: "#6c757d" }}>No words yet</Text>
          <Text style={{ fontSize: 13, color: "#adb5bd" }}>Tap + to add your first word</Text>
        </View>
      ) : (
        <FlatList
          data={words}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 96, gap: 8 }}
          renderItem={({ item }) => {
            const memory = memoryMap[item.id];
            const memInfo = memory ? getMemoryInfo(memory.memoryLevel) : null;
            return (
              <Pressable
                onPress={() => onSelectWord(item)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#e7f1ff" : "#fff",
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "#e9ecef",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 2,
                  elevation: 1,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "700", color: "#212529" }}>{item.headword}</Text>
                    <Text style={{ fontSize: 15, color: "#495057", marginTop: 4 }}>{item.meaningJa}</Text>
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
                        <View key={tag} style={{ backgroundColor: "#f1f3f5", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11, color: "#6c757d" }}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : <View style={{ flex: 1 }} />}
                  {item.examples.length > 0 && (
                    <Text style={{ fontSize: 11, color: "#adb5bd" }}>{item.examples.length} example{item.examples.length !== 1 ? "s" : ""}</Text>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={onAdd}
        style={({ pressed }) => ({
          position: "absolute",
          bottom: 24,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: pressed ? "#0b5ed7" : "#0d6efd",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#0d6efd",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 6,
        })}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </Pressable>
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
  const [confirmAction, setConfirmAction] = useState<"delete" | "reset" | null>(null);
  const canSpeak = mobileSpeechService.canSpeak();

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
          backgroundColor: "#fff",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: "#e9ecef",
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Pressable onPress={onBack} hitSlop={8} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color="#0d6efd" />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#212529", flex: 1 }}>
          {mode === "create" ? "Add Word" : "Edit Word"}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "#f8f9fa" }}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {errorMsg ? (
          <View style={{ backgroundColor: "#fff3f3", borderWidth: 1, borderColor: "#f5c2c7", borderRadius: 10, padding: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="warning-outline" size={16} color="#842029" />
              <Text style={{ color: "#842029", fontSize: 14 }}>{errorMsg}</Text>
            </View>
          </View>
        ) : null}

        {/* Required Fields */}
        <View style={{ backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e9ecef", overflow: "hidden" }}>
          {/* Headword + Speak */}
          <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={labelStyle}>Headword *</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TextInput
                value={draft.headword}
                onChangeText={(v) => set("headword", v)}
                placeholder="e.g. ephemeral"
                placeholderTextColor="#adb5bd"
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
                    backgroundColor: !draft.headword.trim() ? "#f1f3f5" : pressed ? "#e7f1ff" : "#f8f9fa",
                    borderWidth: 1,
                    borderColor: !draft.headword.trim() ? "#dee2e6" : "#0d6efd",
                    alignItems: "center",
                    justifyContent: "center",
                  })}
                >
                  <Ionicons name="volume-high-outline" size={18} color={!draft.headword.trim() ? "#adb5bd" : "#0d6efd"} />
                </Pressable>
              )}
            </View>
          </View>
          <Divider />
          <FieldRow label="Meaning (JA) *">
            <TextInput
              value={draft.meaningJa}
              onChangeText={(v) => set("meaningJa", v)}
              placeholder="e.g. 短命の、はかない"
              placeholderTextColor="#adb5bd"
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
                  borderColor: draft.pos === pos ? "#0d6efd" : "#dee2e6",
                  backgroundColor: draft.pos === pos ? "#e7f1ff" : "#fff",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: draft.pos === pos ? "700" : "400", color: draft.pos === pos ? "#0d6efd" : "#495057" }}>
                  {pos}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Tags + Memo */}
        <View style={{ backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e9ecef", overflow: "hidden" }}>
          <FieldRow label="Tags (comma-separated)">
            <TextInput
              value={(draft.tags ?? []).join(", ")}
              onChangeText={(v) => set("tags", v.split(",").map((t) => t.trim()).filter(Boolean))}
              placeholder="e.g. TOEFL, important"
              placeholderTextColor="#adb5bd"
              style={fieldInputStyle}
            />
          </FieldRow>
          <Divider />
          <FieldRow label="Memo">
            <TextInput
              value={draft.memo ?? ""}
              onChangeText={(v) => set("memo", v)}
              placeholder="Optional note"
              placeholderTextColor="#adb5bd"
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
                borderColor: "#0d6efd",
                backgroundColor: pressed ? "#e7f1ff" : "#fff",
              })}
            >
              <Text style={{ fontSize: 14, color: "#0d6efd", fontWeight: "700" }}>+ Add</Text>
            </Pressable>
          </View>

          {draftExamples.length === 0 ? (
            <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e9ecef", padding: 16, alignItems: "center" }}>
              <Text style={{ fontSize: 13, color: "#adb5bd" }}>No examples yet</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {draftExamples.map((ex, index) => (
                <View
                  key={ex.id}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#e9ecef",
                    overflow: "hidden",
                  }}
                >
                  {/* Example header */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#f8f9fa", borderBottomWidth: 1, borderBottomColor: "#e9ecef" }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#6c757d" }}>Example {index + 1}</Text>
                    <Pressable
                      onPress={() => removeExample(ex.id)}
                      hitSlop={8}
                    >
                      <Text style={{ fontSize: 13, color: "#dc3545", fontWeight: "600" }}>Remove</Text>
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
                        placeholderTextColor="#adb5bd"
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
                            backgroundColor: !ex.en.trim() ? "#f1f3f5" : pressed ? "#e7f1ff" : "#f8f9fa",
                            borderWidth: 1,
                            borderColor: !ex.en.trim() ? "#dee2e6" : "#0d6efd",
                            alignItems: "center",
                            justifyContent: "center",
                          })}
                        >
                          <Ionicons name="volume-high-outline" size={16} color={!ex.en.trim() ? "#adb5bd" : "#0d6efd"} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                  <Divider />
                  {/* Japanese */}
                  <FieldRow label="Japanese (optional)">
                    <TextInput
                      value={ex.ja}
                      onChangeText={(v) => updateExample(ex.id, "ja", v)}
                      placeholder="Japanese translation"
                      placeholderTextColor="#adb5bd"
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
            backgroundColor: busy || !isValid ? "#a5c8ff" : pressed ? "#0b5ed7" : "#0d6efd",
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
            <View style={{ height: 1, backgroundColor: "#e9ecef" }} />
            <Text style={{ fontSize: 12, color: "#adb5bd", textAlign: "center" }}>Danger Zone</Text>

            <Pressable
              onPress={() => setConfirmAction("reset")}
              disabled={busy}
              style={({ pressed }) => ({
                borderRadius: 12,
                paddingVertical: 13,
                alignItems: "center",
                borderWidth: 1.5,
                borderColor: "#fd7e14",
                backgroundColor: pressed ? "#fff4e6" : "#fff",
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="refresh-outline" size={18} color="#fd7e14" />
                <Text style={{ color: "#fd7e14", fontWeight: "700", fontSize: 15 }}>Reset Memory</Text>
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
                borderColor: "#dc3545",
                backgroundColor: pressed ? "#fff5f5" : "#fff",
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="trash-outline" size={18} color="#dc3545" />
                <Text style={{ color: "#dc3545", fontWeight: "700", fontSize: 15 }}>Delete Word</Text>
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
        confirmColor={confirmAction === "delete" ? "#dc3545" : "#fd7e14"}
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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, gap: 16 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#212529" }}>{title}</Text>
          <Text style={{ fontSize: 14, color: "#6c757d" }}>{message}</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#dee2e6",
                backgroundColor: pressed ? "#f1f3f5" : "#fff",
                alignItems: "center",
              })}
            >
              <Text style={{ fontWeight: "600", color: "#495057" }}>Cancel</Text>
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

const POS_COLORS: Record<Pos, { bg: string; text: string }> = {
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

function PosBadge({ pos }: { pos: Pos }) {
  const colors = POS_COLORS[pos] ?? { bg: "#f1f3f5", text: "#495057" };
  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.text }}>{pos}</Text>
    </View>
  );
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
      <Text style={labelStyle}>{label}</Text>
      {children}
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: "#f1f3f5" }} />;
}

const labelStyle = {
  fontSize: 12,
  fontWeight: "600" as const,
  color: "#6c757d",
  marginBottom: 4,
};

const fieldInputStyle = {
  fontSize: 15,
  color: "#212529",
  paddingVertical: 2,
} as const;
