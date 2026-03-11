import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import type { ExampleSentence, MemoryState, Pos } from "../../../../src/api/types";
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
  if (level === 0) return { label: "新規", color: "#6c757d", bg: "#f1f3f5" };
  if (level <= 3) return { label: "学習中", color: "#e67700", bg: "#fff3bf" };
  if (level <= 6) return { label: "復習", color: "#1971c2", bg: "#e7f5ff" };
  return { label: "定着", color: "#2b8a3e", bg: "#ebfbee" };
}

// ─── WordsScreen (root) ───────────────────────────────────────────────────────

export function WordsScreen({ service }: { service: MobileWordService }) {
  const [subRoute, setSubRoute] = useState<SubRoute>("list");
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedPos, setSelectedPos] = useState<Pos | undefined>(undefined);
  const [words, setWords] = useState<WordItem[]>([]);
  const [memoryMap, setMemoryMap] = useState<Record<string, MemoryState>>({});
  const [selectedWord, setSelectedWord] = useState<WordItem | null>(null);
  const [draft, setDraft] = useState<WordDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const listed = await service.listWords({ q: query, pos: selectedPos });
      setWords(listed.items);
      setMemoryMap(listed.memoryMap);
    } finally {
      setBusy(false);
    }
  }, [query, selectedPos, service]);

  useEffect(() => {
    void load();
  }, [load]);

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
      setErrorMsg("見出し語と日本語訳は必須です");
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
      setErrorMsg("登録に失敗しました");
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
      setErrorMsg("更新に失敗しました");
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
      setErrorMsg("削除に失敗しました");
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
      // Reload to update memory display
      await load();
      setSubRoute("list");
    } catch {
      setErrorMsg("リセットに失敗しました");
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
      selectedPos={selectedPos}
      busy={busy}
      onQueryChange={setQuery}
      onToggleSearch={() => {
        setShowSearch((v) => !v);
        if (showSearch) setQuery("");
      }}
      onPosChange={setSelectedPos}
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
  selectedPos,
  busy,
  onQueryChange,
  onToggleSearch,
  onPosChange,
  onSelectWord,
  onAdd,
}: {
  words: WordItem[];
  memoryMap: Record<string, MemoryState>;
  query: string;
  showSearch: boolean;
  selectedPos: Pos | undefined;
  busy: boolean;
  onQueryChange: (q: string) => void;
  onToggleSearch: () => void;
  onPosChange: (pos: Pos | undefined) => void;
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
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#212529" }}>単語帳</Text>
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
            <Text style={{ fontSize: 16 }}>{showSearch ? "✕" : "🔍"}</Text>
          </Pressable>
        </View>

        {showSearch && (
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder="見出し語・意味で検索"
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 10 }}
          contentContainerStyle={{ gap: 6 }}
        >
          <PosChip label="すべて" active={!selectedPos} onPress={() => onPosChange(undefined)} />
          {POS_OPTIONS.map((pos) => (
            <PosChip key={pos} label={pos} active={selectedPos === pos} onPress={() => onPosChange(pos)} />
          ))}
        </ScrollView>
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={{ fontSize: 13, color: "#6c757d" }}>{busy ? "読み込み中..." : `${words.length} 件`}</Text>
      </View>

      {words.length === 0 && !busy ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 80 }}>
          <Text style={{ fontSize: 40 }}>📭</Text>
          <Text style={{ fontSize: 15, color: "#6c757d" }}>単語がありません</Text>
          <Text style={{ fontSize: 13, color: "#adb5bd" }}>下の＋ボタンで追加しましょう</Text>
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
                    {item.pronunciation ? (
                      <Text style={{ fontSize: 13, color: "#6c757d", marginTop: 1 }}>{item.pronunciation}</Text>
                    ) : null}
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
                    <Text style={{ fontSize: 11, color: "#adb5bd" }}>例文 {item.examples.length}件</Text>
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
        <Text style={{ fontSize: 28, color: "#fff", lineHeight: 34, marginTop: -2 }}>+</Text>
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

  // Sync draft.examples to local DraftExample state
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
          <Text style={{ fontSize: 22, color: "#0d6efd" }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#212529", flex: 1 }}>
          {mode === "create" ? "単語を追加" : "単語を編集"}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "#f8f9fa" }}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {errorMsg ? (
          <View style={{ backgroundColor: "#fff3f3", borderWidth: 1, borderColor: "#f5c2c7", borderRadius: 10, padding: 12 }}>
            <Text style={{ color: "#842029", fontSize: 14 }}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        {/* Required Fields */}
        <View style={{ backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e9ecef", overflow: "hidden" }}>
          {/* Headword + Speak */}
          <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={labelStyle}>見出し語 *</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TextInput
                value={draft.headword}
                onChangeText={(v) => set("headword", v)}
                placeholder="例: ephemeral"
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
                  <Text style={{ fontSize: 16 }}>🔊</Text>
                </Pressable>
              )}
            </View>
          </View>
          <Divider />
          <FieldRow label="発音">
            <TextInput
              value={draft.pronunciation}
              onChangeText={(v) => set("pronunciation", v)}
              placeholder="例: /ɪˈfem.ər.əl/"
              placeholderTextColor="#adb5bd"
              style={fieldInputStyle}
            />
          </FieldRow>
          <Divider />
          <FieldRow label="日本語訳 *">
            <TextInput
              value={draft.meaningJa}
              onChangeText={(v) => set("meaningJa", v)}
              placeholder="例: 短命の、はかない"
              placeholderTextColor="#adb5bd"
              style={fieldInputStyle}
            />
          </FieldRow>
        </View>

        {/* POS Selector */}
        <View>
          <Text style={[labelStyle, { marginBottom: 8 }]}>品詞</Text>
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
          <FieldRow label="タグ (カンマ区切り)">
            <TextInput
              value={(draft.tags ?? []).join(", ")}
              onChangeText={(v) => set("tags", v.split(",").map((t) => t.trim()).filter(Boolean))}
              placeholder="例: TOEFL, 重要"
              placeholderTextColor="#adb5bd"
              style={fieldInputStyle}
            />
          </FieldRow>
          <Divider />
          <FieldRow label="メモ">
            <TextInput
              value={draft.memo}
              onChangeText={(v) => set("memo", v)}
              placeholder="任意のメモ"
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
            <Text style={[labelStyle]}>例文 ({draftExamples.length})</Text>
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
              <Text style={{ fontSize: 14, color: "#0d6efd", fontWeight: "700" }}>＋ 追加</Text>
            </Pressable>
          </View>

          {draftExamples.length === 0 ? (
            <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e9ecef", padding: 16, alignItems: "center" }}>
              <Text style={{ fontSize: 13, color: "#adb5bd" }}>例文はまだありません</Text>
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
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#6c757d" }}>例文 {index + 1}</Text>
                    <Pressable
                      onPress={() => removeExample(ex.id)}
                      hitSlop={8}
                    >
                      <Text style={{ fontSize: 13, color: "#dc3545", fontWeight: "600" }}>削除</Text>
                    </Pressable>
                  </View>

                  {/* English */}
                  <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
                    <Text style={labelStyle}>英文</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <TextInput
                        value={ex.en}
                        onChangeText={(v) => updateExample(ex.id, "en", v)}
                        placeholder="英語の例文"
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
                          <Text style={{ fontSize: 14 }}>🔊</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                  <Divider />
                  {/* Japanese */}
                  <FieldRow label="日本語訳 (任意)">
                    <TextInput
                      value={ex.ja}
                      onChangeText={(v) => updateExample(ex.id, "ja", v)}
                      placeholder="日本語訳"
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
            {busy ? "処理中..." : mode === "create" ? "追加する" : "更新する"}
          </Text>
        </Pressable>

        {/* Danger Zone (edit only) */}
        {mode === "edit" && (
          <View style={{ gap: 10 }}>
            <View style={{ height: 1, backgroundColor: "#e9ecef" }} />
            <Text style={{ fontSize: 12, color: "#adb5bd", textAlign: "center" }}>危険な操作</Text>

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
              <Text style={{ color: "#fd7e14", fontWeight: "700", fontSize: 15 }}>🔄 記憶レベルをリセット</Text>
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
              <Text style={{ color: "#dc3545", fontWeight: "700", fontSize: 15 }}>🗑️ 単語を削除</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Confirm Dialog */}
      <ConfirmModal
        visible={confirmAction !== null}
        title={confirmAction === "delete" ? "単語を削除しますか？" : "記憶をリセットしますか？"}
        message={
          confirmAction === "delete"
            ? "この操作は元に戻せません。"
            : "この単語の学習進捗がリセットされます。"
        }
        confirmLabel={confirmAction === "delete" ? "削除する" : "リセットする"}
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
              <Text style={{ fontWeight: "600", color: "#495057" }}>キャンセル</Text>
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

function PosChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 5,
        paddingHorizontal: 13,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: active ? "#0d6efd" : "#dee2e6",
        backgroundColor: active ? "#e7f1ff" : "#fff",
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: active ? "700" : "400", color: active ? "#0d6efd" : "#495057" }}>
        {label}
      </Text>
    </Pressable>
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

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
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
