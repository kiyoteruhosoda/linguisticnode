export type Pos =
  | "noun" | "verb" | "adj" | "adv" | "prep"
  | "conj" | "pron" | "det" | "interj" | "other";

export type Rating = "again" | "hard" | "good" | "easy";

export interface Pronunciation {
  ipa?: string;
  notation?: string;
}

export interface ExampleSentence {
  id: string;
  en: string;
  ja?: string | null;
  source?: string | null;
}

export interface MeaningEntry {
  meaningJa: string;
  tags?: string[];
  examples?: ExampleSentence[];
}

export interface PosEntry {
  pos: Pos;
  pronunciation?: Pronunciation;
  meanings: MeaningEntry[];
}

export interface WordEntry {
  id: string;
  headword: string;
  pronunciation?: Pronunciation;
  entries: PosEntry[];
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryState {
  wordId: string;
  memoryLevel: number;
  ease: number;
  intervalDays: number;
  dueAt: string;
  lastRating?: Rating | null;
  lastReviewedAt?: string | null;
  lapseCount: number;
  reviewCount: number;
}

export interface MeResponse {
  userId: string;
  username: string;
}

export interface NextCardResponse {
  ok: boolean;
  card: null | { word: WordEntry; memory: MemoryState };
}

export interface AppData {
  schemaVersion: number;
  exportedAt: string;
  words: WordEntry[];
  memory: MemoryState[];
}

/**
 * Flexible input types for manual file creation (optional fields)
 * Supports both v1 flat format and v2 entries format.
 */
export interface ExampleSentenceForImport {
  id?: string;
  en: string;
  ja?: string | null;
  source?: string | null;
}

export interface MeaningEntryForImport {
  meaningJa: string;
  tags?: string[];
  examples?: ExampleSentenceForImport[];
}

export interface PosEntryForImport {
  pos: Pos;
  pronunciation?: { ipa?: string; notation?: string };
  meanings: MeaningEntryForImport[];
}

export interface WordEntryForImport {
  id?: string;
  headword: string;
  memo?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // v2 format
  pronunciation?: { ipa?: string; notation?: string } | string | null;
  entries?: PosEntryForImport[];
  // v1 flat format (backward compat)
  pos?: Pos;
  meaningJa?: string;
  examples?: ExampleSentenceForImport[];
  tags?: string[];
}

export interface MemoryStateForImport {
  wordId: string;
  memoryLevel?: number;
  ease?: number;
  intervalDays?: number;
  dueAt?: string;
  lastRating?: Rating | null;
  lastReviewedAt?: string | null;
  lapseCount?: number;
  reviewCount?: number;
}

export interface AppDataForImport {
  schemaVersion?: number;
  exportedAt?: string;
  words: WordEntryForImport[];
  memory?: MemoryStateForImport[];
}

// Example Test Types (flat structure, compatible with backend API)
export interface ExampleTestItem {
  id: string;
  en: string;
  ja?: string | null;
  source?: string | null;
  word: {
    id: string;
    headword: string;
    pronunciation?: string | null;
    pos: Pos;
    meaningJa: string;
    tags: string[];
  };
}

export interface NextExampleResponse {
  example: ExampleTestItem | null;
}
