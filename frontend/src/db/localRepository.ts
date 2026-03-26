/**
 * Local repository layer for offline-first vocabulary management
 * 
 * All CRUD operations on words and memory states go through this layer.
 * Changes are immediately persisted to IndexedDB and marked as dirty.
 */

import type { WordEntry, MemoryState } from "../api/types";
import type { VocabFile } from "./types";
import {
  getVocabFile,
  saveVocabFile,
  getSyncMetadata,
  saveSyncMetadata,
  initializeDB,
} from "./indexeddb";
import { generateUuid } from "../core/identity/uuid";

/**
 * Ensure database is initialized
 */
export async function ensureInitialized(): Promise<void> {
  await initializeDB();
}

/**
 * Mark local data as dirty (needs sync)
 */
async function markDirty(): Promise<void> {
  try {
    const metadata = await getSyncMetadata();
    if (metadata && !metadata.dirty) {
      metadata.dirty = true;
      await saveSyncMetadata(metadata);
    }
  } catch (error) {
    console.error("Failed to mark dirty:", error);
    // Don't throw - dirty flag is informational
  }
}

/**
 * Update vocabulary file timestamp
 */
function touchFile(file: VocabFile): VocabFile {
  return {
    ...file,
    updatedAt: new Date().toISOString(),
  };
}

// ========== Word CRUD ==========

export interface GetWordsOptions {
  q?: string;
  pos?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: "headword" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

/**
 * Get all words (with optional filtering, sorting, and pagination)
 */
export async function getWords(
  options?: GetWordsOptions
): Promise<{ words: WordEntry[]; memoryMap: Record<string, MemoryState>; total: number }> {
  try {
    const file = await getVocabFile();
    if (!file) {
      throw new Error("Database not initialized");
    }

    let words = file.words;

    // Apply filters
    if (options?.q) {
      const query = options.q.toLowerCase();
      words = words.filter(
        (w) =>
          w.headword.toLowerCase().includes(query) ||
          w.entries.some((e) => e.meanings.some((m) => m.meaningJa.toLowerCase().includes(query)))
      );
    }

    if (options?.pos) {
      words = words.filter((w) => w.entries.some((e) => e.pos === options.pos));
    }

    if (options?.tags && options.tags.length > 0) {
      const tags = new Set(options.tags);
      words = words.filter((w) =>
        w.entries.some((e) => e.meanings.some((m) => m.tags?.some((tag) => tags.has(tag))))
      );
    }

    const total = words.length;

    // Apply sorting
    if (options?.sortBy) {
      const sortBy = options.sortBy;
      const order = options.sortOrder === "desc" ? -1 : 1;

      words.sort((a, b) => {
        const aVal = a[sortBy] || "";
        const bVal = b[sortBy] || "";
        return aVal < bVal ? -order : aVal > bVal ? order : 0;
      });
    }

    // Apply pagination
    if (options?.offset !== undefined || options?.limit !== undefined) {
      const offset = options.offset || 0;
      const limit = options.limit || words.length;
      words = words.slice(offset, offset + limit);
    }

    // Build memory map
    const memoryMap: Record<string, MemoryState> = {};
    // Ensure file.memory is an array (defensive programming)
    const memoryArray = Array.isArray(file.memory) ? file.memory : [];
    for (const mem of memoryArray) {
      memoryMap[mem.wordId] = mem;
    }

    return { words, memoryMap, total };
  } catch (error) {
    console.error("Failed to get words:", error);
    throw new Error(
      `Failed to retrieve words: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get a single word by ID
 */
export async function getWordById(id: string): Promise<WordEntry | null> {
  try {
    const file = await getVocabFile();
    if (!file) return null;

    return file.words.find((w) => w.id === id) || null;
  } catch (error) {
    console.error("Failed to get word by ID:", error);
    throw new Error(
      `Failed to retrieve word: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get all unique tags from all words
 */
export async function getAllTags(): Promise<string[]> {
  try {
    const file = await getVocabFile();
    if (!file) return [];

    const tagSet = new Set<string>();
    for (const word of file.words) {
      for (const entry of word.entries) {
        for (const meaning of entry.meanings) {
          for (const tag of (meaning.tags ?? [])) {
            tagSet.add(tag);
          }
        }
      }
    }

    return Array.from(tagSet).sort();
  } catch (error) {
    console.error("Failed to get tags:", error);
    throw new Error(
      `Failed to retrieve tags: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create a new word
 */
export async function createWord(
  data: Omit<WordEntry, "id" | "createdAt" | "updatedAt">
): Promise<WordEntry> {
  try {
    const file = await getVocabFile();
    if (!file) {
      throw new Error("Database not initialized");
    }

    const now = new Date().toISOString();
    const newWord: WordEntry = {
      ...data,
      id: generateUuid(),
      createdAt: now,
      updatedAt: now,
    };

    file.words.push(newWord);
    await saveVocabFile(touchFile(file));
    await markDirty();

    return newWord;
  } catch (error) {
    console.error("Failed to create word:", error);
    throw new Error(
      `Failed to create word: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update an existing word
 */
export async function updateWord(
  id: string,
  data: Omit<WordEntry, "id" | "createdAt" | "updatedAt">
): Promise<WordEntry> {
  try {
    const file = await getVocabFile();
    if (!file) {
      throw new Error("Database not initialized");
    }

    const index = file.words.findIndex((w) => w.id === id);
    if (index === -1) {
      throw new Error(`Word not found: ${id}`);
    }

    const now = new Date().toISOString();
    const updatedWord: WordEntry = {
      ...data,
      id,
      createdAt: file.words[index].createdAt,
      updatedAt: now,
    };

    file.words[index] = updatedWord;
  await saveVocabFile(touchFile(file));
  await markDirty();

  return updatedWord;
  } catch (error) {
    console.error("Failed to update word:", error);
    throw new Error(
      `Failed to update word: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete a word (and its memory state)
 */
export async function deleteWord(id: string): Promise<void> {
  try {
    const file = await getVocabFile();
    if (!file) {
      throw new Error("Database not initialized");
    }

    file.words = file.words.filter((w) => w.id !== id);
    file.memory = file.memory.filter((m) => m.wordId !== id);

    await saveVocabFile(touchFile(file));
    await markDirty();
  } catch (error) {
    console.error("Failed to delete word:", error);
    throw new Error(
      `Failed to delete word: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ========== Memory/Study Operations ==========

/**
 * Get memory state for a word
 */
export async function getMemoryState(
  wordId: string
): Promise<MemoryState | null> {
  const file = await getVocabFile();
  if (!file) return null;

  return file.memory.find((m) => m.wordId === wordId) || null;
}

/**
 * Get next card due for review
 * 
 * Includes words without memory state (automatically creates default state)
 */
export async function getNextCard(tags?: string[]): Promise<{
  word: WordEntry;
  memory: MemoryState;
} | null> {
  const file = await getVocabFile();
  if (!file) return null;

  const now = new Date().toISOString();
  const memoryById = new Map(file.memory.map((m) => [m.wordId, m]));

  // Build candidates: all words with their memory state (or default)
  let candidates: Array<{ word: WordEntry; memory: MemoryState }> = file.words.map((w) => {
    const memory = memoryById.get(w.id) || {
      wordId: w.id,
      memoryLevel: 0,
      ease: 2.5,
      intervalDays: 0,
      dueAt: now,
      lastRating: null,
      lastReviewedAt: null,
      lapseCount: 0,
      reviewCount: 0,
    };
    return { word: w, memory };
  });

  // Filter by tags if specified
  if (tags && tags.length > 0) {
    const tagSet = new Set(tags);
    candidates = candidates.filter((c) =>
      c.word.entries.some((e) => e.meanings.some((m) => m.tags?.some((tag) => tagSet.has(tag))))
    );
  }

  if (candidates.length === 0) return null;

  // Filter due cards (dueAt <= now)
  const dueCards = candidates.filter((c) => c.memory.dueAt <= now);

  if (dueCards.length > 0) {
    // Priority 1: Due cards, sorted by dueAt (earliest first), then memoryLevel (lowest first)
    dueCards.sort((a, b) => {
      const dateCompare = a.memory.dueAt.localeCompare(b.memory.dueAt);
      if (dateCompare !== 0) return dateCompare;
      return a.memory.memoryLevel - b.memory.memoryLevel;
    });
    return dueCards[0];
  }

  // No due cards - check if all are mastered (memoryLevel >= 4)
  const allMastered = candidates.every((c) => c.memory.memoryLevel >= 4);
  if (allMastered) return null;

  // Priority 2: Not due yet, sorted by memoryLevel (lowest first), then dueAt (earliest first)
  candidates.sort((a, b) => {
    const levelCompare = a.memory.memoryLevel - b.memory.memoryLevel;
    if (levelCompare !== 0) return levelCompare;
    return a.memory.dueAt.localeCompare(b.memory.dueAt);
  });

  return candidates[0];
}

/**
 * Update memory state after review
 */
export async function updateMemoryState(
  wordId: string,
  updates: Partial<MemoryState>
): Promise<MemoryState> {
  const file = await getVocabFile();
  if (!file) {
    throw new Error("Database not initialized");
  }

  const index = file.memory.findIndex((m) => m.wordId === wordId);

  let updatedMemory: MemoryState;

  if (index === -1) {
    // Create new memory state
    updatedMemory = {
      wordId,
      memoryLevel: 0,
      ease: 2.5,
      intervalDays: 0,
      dueAt: new Date().toISOString(),
      lastRating: null,
      lastReviewedAt: null,
      lapseCount: 0,
      reviewCount: 0,
      ...updates,
    };
    file.memory.push(updatedMemory);
  } else {
    // Update existing memory state
    updatedMemory = {
      ...file.memory[index],
      ...updates,
    };
    file.memory[index] = updatedMemory;
  }

  await saveVocabFile(touchFile(file));
  await markDirty();

  return updatedMemory;
}

// ========== Bulk Operations ==========

/**
 * Get entire vocabulary file (for export/sync)
 */
export async function getVocabFileForSync(): Promise<VocabFile> {
  const file = await getVocabFile();
  if (!file) {
    throw new Error("Database not initialized");
  }
  return file;
}

/**
 * Replace entire vocabulary file (for import/sync)
 */
export async function replaceVocabFile(
  newFile: VocabFile,
  markAsClean: boolean = false
): Promise<void> {
  await saveVocabFile(touchFile(newFile));
  
  if (!markAsClean) {
    await markDirty();
  }
}

/**
 * Export data in AppData format (for compatibility)
 */
export async function exportAppData() {
  const file = await getVocabFile();
  if (!file) {
    throw new Error("Database not initialized");
  }

  return {
    schemaVersion: file.schemaVersion,
    exportedAt: new Date().toISOString(),
    words: file.words,
    memory: file.memory,
  };
}
