export type Pos =
  | "noun" | "verb" | "adj" | "adv" | "prep"
  | "conj" | "pron" | "det" | "interj" | "other";

export type Rating = "again" | "hard" | "good" | "easy";

export interface ExampleSentence {
  id: string;
  en: string;
  ja?: string | null;
  source?: string | null;
}

export interface WordEntry {
  id: string;
  headword: string;
  pronunciation?: string | null;
  pos: Pos;
  meaningJa: string;
  examples: ExampleSentence[];
  tags: string[];
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
 */
export interface ExampleSentenceForImport {
  id?: string;
  en: string;
  ja?: string | null;
  source?: string | null;
}

export interface WordEntryForImport {
  id?: string;
  headword: string;
  pronunciation?: string | null;
  pos: Pos;
  meaningJa: string;
  examples?: ExampleSentenceForImport[];
  tags?: string[];
  memo?: string | null;
  createdAt?: string;
  updatedAt?: string;
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

// Example Test Types
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
