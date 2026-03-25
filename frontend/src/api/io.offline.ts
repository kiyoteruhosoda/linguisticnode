/**
 * Offline-first IO API
 * 
 * Export/import operations using local IndexedDB
 */

import type {
  AppData,
  AppDataForImport,
  WordEntry,
  ExampleSentence,
  MemoryState,
  WordEntryForImport,
  ExampleSentenceForImport,
  MemoryStateForImport,
  Pos,
} from "./types";
import * as localRepo from "../db/localRepository";
import type { VocabFile } from "../db/types";

/**
 * Generate a simple UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Normalize AppDataForImport to AppData
 * Generate missing IDs and timestamps
 */
function normalizeAppDataForImport(data: AppDataForImport): AppData {
  const now = new Date().toISOString();

  // Normalize words
  const normalizedWords: WordEntry[] = data.words.map((w: WordEntryForImport) => {
    // Generate ID if missing
    const wordId = w.id || generateUUID();

    // Generate timestamps if missing
    const createdAt = w.createdAt || now;
    const updatedAt = w.updatedAt || now;

    // v2 format with entries, or convert v1 flat to v2
    let entries: WordEntry["entries"];
    if (w.entries && w.entries.length > 0) {
      entries = w.entries.map((e) => ({
        pos: e.pos,
        pronunciation: e.pronunciation,
        meanings: e.meanings.map((m) => ({
          meaningJa: m.meaningJa,
          tags: m.tags,
          examples: (m.examples ?? []).map((ex) => ({
            id: ex.id || generateUUID(),
            en: ex.en,
            ja: ex.ja,
            source: ex.source,
          })),
        })),
      }));
    } else {
      // v1 flat format → convert to v2
      const normalizedExamples: ExampleSentence[] = (w.examples || []).map((ex: ExampleSentenceForImport) => ({
        id: ex.id || generateUUID(),
        en: ex.en,
        ja: ex.ja,
        source: ex.source,
      }));
      entries = [{
        pos: (w.pos || "noun") as Pos,
        meanings: [{
          meaningJa: w.meaningJa || "",
          tags: w.tags || [],
          examples: normalizedExamples,
        }],
      }];
    }

    // Normalize pronunciation
    const pronunciation = typeof w.pronunciation === "string"
      ? { notation: w.pronunciation }
      : w.pronunciation ?? undefined;

    return {
      id: wordId,
      headword: w.headword,
      pronunciation,
      entries,
      memo: w.memo,
      createdAt,
      updatedAt,
    };
  });

  // Normalize memory states
  const normalizedMemory: MemoryState[] = (data.memory || []).map((m: MemoryStateForImport) => {
    const dueAt = m.dueAt || now;
    return {
      wordId: m.wordId,
      memoryLevel: m.memoryLevel ?? 0,
      ease: m.ease ?? 2.5,
      intervalDays: m.intervalDays ?? 0,
      dueAt,
      lastRating: m.lastRating,
      lastReviewedAt: m.lastReviewedAt,
      lapseCount: m.lapseCount ?? 0,
      reviewCount: m.reviewCount ?? 0,
    };
  });

  return {
    schemaVersion: data.schemaVersion || 1,
    exportedAt: data.exportedAt || now,
    words: normalizedWords,
    memory: normalizedMemory,
  };
}

export const ioApi = {
  /**
   * Export all data (offline)
   */
  export: async (): Promise<AppData> => {
    return await localRepo.exportAppData();
  },

  /**
   * Import data (offline)
   * 
   * Supports both complete exported data and manually-created files with optional fields.
   * Missing IDs and timestamps will be auto-generated.
   * 
   * @param data - AppDataForImport to import (flexible format)
   * @param mode - "merge" or "overwrite"
   */
  import: async (
    data: AppDataForImport,
    mode: "merge" | "overwrite" = "merge"
  ): Promise<{ ok: boolean }> => {
    // Validate required fields
    if (!data.words || !Array.isArray(data.words)) {
      throw new Error("Invalid import data: 'words' must be an array");
    }

    // Normalize the data (generate missing IDs, timestamps, etc.)
    const normalizedData = normalizeAppDataForImport(data);

    const vocabFile: VocabFile = {
      schemaVersion: normalizedData.schemaVersion,
      words: normalizedData.words,
      memory: normalizedData.memory,
      updatedAt: new Date().toISOString(),
    };

    if (mode === "overwrite") {
      // Replace entire file
      await localRepo.replaceVocabFile(vocabFile, false);
    } else {
      // Merge mode: add new words, skip existing ones
      const existing = await localRepo.getVocabFileForSync();
      const existingIds = new Set(existing.words.map((w) => w.id));

      for (const word of normalizedData.words) {
        if (!existingIds.has(word.id)) {
          await localRepo.createWord(word);
        }
      }

      // Merge memory states
      const existingMemoryIds = new Set(existing.memory.map((m) => m.wordId));
      for (const mem of normalizedData.memory) {
        if (!existingMemoryIds.has(mem.wordId)) {
          await localRepo.updateMemoryState(mem.wordId, mem);
        }
      }
    }

    return { ok: true };
  },
};
