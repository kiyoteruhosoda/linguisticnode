// frontend/src/rnw/components/RnwWordListTable.tsx

import { useState, useMemo } from "react";
import type { MemoryState, WordEntry } from "../../api/types";
import { Pressable, Text, View } from "../react-native";
import { StyleSheet } from "../stylesheet";
import { RnwBadge } from "./RnwBadge";
import { RnwLevelBadge } from "./RnwLevelBadge";

type SortKey = "word" | "pos" | "meaning" | "examples" | "level";
type SortDir = "asc" | "desc";

type RnwWordListTableProps = {
  items: WordEntry[];
  memoryMap: Record<string, MemoryState>;
  onSelectWord: (wordId: string) => void;
};

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <i className="fa-solid fa-sort ms-1" style={{ opacity: 0.3 }} />;
  return dir === "asc"
    ? <i className="fa-solid fa-sort-up ms-1" />
    : <i className="fa-solid fa-sort-down ms-1" />;
}

export function RnwWordListTable({ items, memoryMap, onSelectWord }: RnwWordListTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("word");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let cmp = 0;
      const aLevel = memoryMap[a.id]?.memoryLevel ?? 0;
      const bLevel = memoryMap[b.id]?.memoryLevel ?? 0;
      const aExamples = a.entries.reduce((sum, e) => sum + e.meanings.reduce((s, m) => s + (m.examples?.length ?? 0), 0), 0);
      const bExamples = b.entries.reduce((sum, e) => sum + e.meanings.reduce((s, m) => s + (m.examples?.length ?? 0), 0), 0);

      switch (sortKey) {
        case "word":
          cmp = a.headword.localeCompare(b.headword);
          break;
        case "pos":
          cmp = (a.entries[0]?.pos ?? "").localeCompare(b.entries[0]?.pos ?? "");
          break;
        case "meaning":
          cmp = (a.entries[0]?.meanings[0]?.meaningJa ?? "").localeCompare(b.entries[0]?.meanings[0]?.meaningJa ?? "");
          break;
        case "examples":
          cmp = aExamples - bExamples;
          break;
        case "level":
          cmp = aLevel - bLevel;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, memoryMap, sortKey, sortDir]);

  return (
    <View style={styles.container} testID="rnw-word-list-table">
      <View style={styles.headerRow}>
        <Pressable style={{ ...styles.headerCell, ...styles.wordCell }} onPress={() => handleSort("word")}>
          <Text style={styles.headerText}>Word <SortIcon active={sortKey === "word"} dir={sortDir} /></Text>
        </Pressable>
        <Pressable style={{ ...styles.headerCell, ...styles.posCell }} onPress={() => handleSort("pos")}>
          <Text style={styles.headerText}>POS <SortIcon active={sortKey === "pos"} dir={sortDir} /></Text>
        </Pressable>
        <Pressable style={{ ...styles.headerCell, ...styles.meaningCell }} onPress={() => handleSort("meaning")}>
          <Text style={styles.headerText}>Meaning <SortIcon active={sortKey === "meaning"} dir={sortDir} /></Text>
        </Pressable>
        <Pressable style={{ ...styles.headerCell, ...styles.examplesCell }} onPress={() => handleSort("examples")}>
          <Text style={styles.headerText}>Examples <SortIcon active={sortKey === "examples"} dir={sortDir} /></Text>
        </Pressable>
        <Pressable style={{ ...styles.headerCell, ...styles.levelCell }} onPress={() => handleSort("level")}>
          <Text style={styles.headerText}>Level <SortIcon active={sortKey === "level"} dir={sortDir} /></Text>
        </Pressable>
      </View>

      {sorted.map((word) => {
        const memoryLevel = memoryMap[word.id]?.memoryLevel ?? 0;
        const primaryMeaning = word.entries[0]?.meanings[0]?.meaningJa ?? "";
        const exampleCount = word.entries.reduce(
          (sum, e) => sum + e.meanings.reduce((s, m) => s + (m.examples?.length ?? 0), 0),
          0,
        );
        return (
          <Pressable
            key={word.id}
            onPress={() => onSelectWord(word.id)}
            style={({ pressed }) => ({
              ...styles.row,
              ...(pressed ? styles.rowPressed : {}),
            })}
            testID={`rnw-word-row-${word.id}`}
          >
            <Text style={{ ...styles.cell, ...styles.wordCell, ...styles.wordText }}>{word.headword}</Text>
            <Text style={{ ...styles.cell, ...styles.posCell }}>
              {word.entries.map((e) => (
                <RnwBadge key={e.pos} tone="secondary" variant="pill">{e.pos}</RnwBadge>
              ))}
            </Text>
            <Text style={{ ...styles.cell, ...styles.meaningCell }}>{primaryMeaning}</Text>
            <Text style={{ ...styles.cell, ...styles.examplesCell }}>{exampleCount}</Text>
            <Text style={{ ...styles.cell, ...styles.levelCell }}>
              <RnwLevelBadge level={memoryLevel} />
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderColor: "#dee2e6",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },

  headerRow: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    borderBottomColor: "#dee2e6",
    borderBottomWidth: 1,
    // 行の高さ計算を安定させる
    alignItems: "stretch",
  },

  row: {
    display: "flex",
    flexDirection: "row",
    borderBottomColor: "#dee2e6",
    borderBottomWidth: 1,
    backgroundColor: "#ffffff",
    cursor: "pointer",
    alignItems: "stretch",

    // ✅ Pressable(button) のデフォルトを潰す（重要）
    borderWidth: 0,
    padding: 0,
    margin: 0,
    width: "100%",
    textAlign: "left",
    // RNW で効く場合がある
    outlineStyle: "none",
  },

  rowPressed: {
    backgroundColor: "#f8f9fa",
  },

  headerCell: {
    paddingInline: 12,
    paddingBlock: 10,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    borderWidth: 0,
    margin: 0,
    backgroundColor: "transparent",
  },

  headerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#495057",
    whiteSpace: "nowrap",
  },

  cell: {
    paddingInline: 12,
    paddingBlock: 12,
    fontSize: 14,
    color: "#212529",
    display: "flex",
    alignItems: "center",

    // ✅ flex子要素がはみ出して列幅を壊さない
    minWidth: 0,
  },

  // ✅ %幅をやめて比率で管理（合計のズレが起きない）
  // 例：Word:2 / POS:1 / Meaning:4 / Examples:1 / Level:1
  wordCell: { flexGrow: 2, flexShrink: 1, flexBasis: 0 },
  posCell: { flexGrow: 1, flexShrink: 0, flexBasis: 0 },
  meaningCell: { flexGrow: 4, flexShrink: 1, flexBasis: 0 },
  examplesCell: { flexGrow: 1, flexShrink: 0, flexBasis: 0 },
  levelCell: { flexGrow: 1, flexShrink: 0, flexBasis: 0 },

  wordText: {
    fontWeight: "600",
    // 任意：1行で省略したいなら
    // whiteSpace: "nowrap",
    // overflow: "hidden",
    // textOverflow: "ellipsis",
  },

});

