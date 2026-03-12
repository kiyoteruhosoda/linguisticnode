import type {
  AppDataForImport,
  ExampleSentence,
  ExampleSentenceForImport,
  MemoryState,
  MemoryStateForImport,
  WordEntry,
  WordEntryForImport,
} from "../../../../src/api/types";
import type { VocabFile } from "../../../../src/db/types";
import { generateUUID } from "./mobileUuid";

export interface VocabFileNormalizerOptions {
  /** ID が未指定のエントリに付与する関数。テストで決定論的な値を注入できる。 */
  generateId?: () => string;
  /** createdAt / updatedAt のデフォルト値。省略時は呼び出し時刻。 */
  now?: string;
}

/**
 * インポートデータを内部の VocabFile 形式に正規化するドメインポリシー。
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
    const examples: ExampleSentence[] = (w.examples ?? []).map((ex: ExampleSentenceForImport) => ({
      id: ex.id ?? genId(),
      en: ex.en,
      ja: ex.ja ?? null,
      source: ex.source ?? null,
    }));
    return {
      id: wordId,
      headword: w.headword,
      pronunciation: w.pronunciation ?? null,
      pos: w.pos,
      meaningJa: w.meaningJa,
      examples,
      tags: w.tags ?? [],
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
    schemaVersion: data.schemaVersion ?? 1,
    words,
    memory,
    updatedAt: now,
  };
}
