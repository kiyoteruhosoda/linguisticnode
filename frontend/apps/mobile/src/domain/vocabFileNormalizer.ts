import type {
  AppDataForImport,
  ExampleSentence,
  MemoryState,
  MemoryStateForImport,
  MeaningEntry,
  Pos,
  PosEntry,
  Pronunciation,
  WordEntry,
  WordEntryForImport,
} from "../../../../src/api/types";
import type { VocabFile } from "../../../../src/db/types";
import { generateUUID } from "./mobileUuid";

const VALID_POS = new Set<Pos>(["noun", "verb", "adj", "adv", "prep", "conj", "pron", "det", "interj", "other"]);

const POS_ALIAS: Record<string, Pos> = {
  adjective: "adj",
  adverb: "adv",
  preposition: "prep",
  conjunction: "conj",
  pronoun: "pron",
  determiner: "det",
  interjection: "interj",
};

function normalizePos(raw: string): Pos {
  const lower = raw.toLowerCase();
  if (VALID_POS.has(lower as Pos)) return lower as Pos;
  if (POS_ALIAS[lower]) return POS_ALIAS[lower];
  return "other";
}

export interface VocabFileNormalizerOptions {
  /** ID が未指定のエントリに付与する関数。テストで決定論的な値を注入できる。 */
  generateId?: () => string;
  /** createdAt / updatedAt のデフォルト値。省略時は呼び出し時刻。 */
  now?: string;
}

/**
 * インポートデータを内部の VocabFile 形式に正規化するドメインポリシー。
 * - v1 フラット形式と v2 entries 形式の両方をサポート
 * - ID が未指定のエントリには UUID を採番する
 * - 省略可能フィールドにはビジネス上のデフォルト値を適用する
 */
export function normalizeVocabFileForImport(
  data: AppDataForImport,
  options: VocabFileNormalizerOptions = {},
): VocabFile {
  const genId = options.generateId ?? generateUUID;
  const now = options.now ?? new Date().toISOString();

  const words: WordEntry[] = data.words.map((w: WordEntryForImport) => {
    const wordId = w.id ?? genId();

    let entries: PosEntry[];

    if (w.entries && w.entries.length > 0) {
      // v2 format: entries array present
      entries = w.entries.map((entry) => {
        const meanings: MeaningEntry[] = entry.meanings.map((m) => {
          const examples: ExampleSentence[] = (m.examples ?? []).map((ex) => ({
            id: ex.id ?? genId(),
            en: ex.en,
            ja: ex.ja ?? null,
            source: ex.source ?? null,
          }));
          return {
            meaningJa: m.meaningJa,
            tags: m.tags ?? [],
            examples,
          };
        });
        return {
          pos: normalizePos(entry.pos),
          pronunciation: entry.pronunciation,
          meanings,
        };
      });
    } else if (w.pos != null && w.meaningJa != null) {
      // v1 flat format → convert to v2 entries
      const examples: ExampleSentence[] = (w.examples ?? []).map((ex) => ({
        id: ex.id ?? genId(),
        en: ex.en,
        ja: ex.ja ?? null,
        source: ex.source ?? null,
      }));
      entries = [
        {
          pos: normalizePos(w.pos),
          meanings: [
            {
              meaningJa: w.meaningJa,
              tags: w.tags ?? [],
              examples,
            },
          ],
        },
      ];
    } else {
      entries = [];
    }

    // Normalize pronunciation: string (v1) → { notation } object, or object (v2) → as-is
    let pronunciation: Pronunciation | undefined;
    if (w.pronunciation) {
      if (typeof w.pronunciation === "string") {
        pronunciation = { notation: w.pronunciation };
      } else {
        pronunciation = w.pronunciation;
      }
    }

    return {
      id: wordId,
      headword: w.headword,
      pronunciation,
      entries,
      memo: w.memo ?? null,
      createdAt: w.createdAt ?? now,
      updatedAt: w.updatedAt ?? now,
    };
  });

  const memory: MemoryState[] = (data.memory ?? []).map((m: MemoryStateForImport) => ({
    wordId: m.wordId,
    memoryLevel: m.memoryLevel ?? 0,
    ease: m.ease ?? 2.5,
    intervalDays: m.intervalDays ?? 0,
    dueAt: m.dueAt ?? now,
    lastRating: m.lastRating ?? null,
    lastReviewedAt: m.lastReviewedAt ?? null,
    lapseCount: m.lapseCount ?? 0,
    reviewCount: m.reviewCount ?? 0,
  }));

  return {
    schemaVersion: 2,
    words,
    memory,
    updatedAt: now,
  };
}
