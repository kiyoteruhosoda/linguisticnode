import type { MemoryState, Rating, WordEntry } from "../../../../src/api/types";
import type { WordDraft, WordListQuery, WordListResult } from "../../../../src/core/word/wordGateway";
import type { StudyCard } from "../../../../src/core/study/studyGateway";
import type { SyncResult, SyncStatus, SyncSuccess } from "../../../../src/core/sync/syncGateway";
import type { ConflictResolution, VocabFile } from "../../../../src/db/types";
import type { StorageAdapter } from "../../../../src/core/storage";
import type { MobileLearningRepositoryPort } from "./mobileLearningRepository.types";
import { generateUUID } from "./mobileUuid";

const DAY_MS = 24 * 60 * 60 * 1000;
const MOBILE_REPOSITORY_STORAGE_KEY = "mobile.learning-repository.v1";

function nextIntervalByRating(rating: Rating, current: number): number {
  switch (rating) {
    case "again":
      return 1;
    case "hard":
      return Math.max(1, Math.round(current * 1.2));
    case "good":
      return Math.max(1, Math.round(current * 2));
    case "easy":
      return Math.max(2, Math.round(current * 3));
  }
}

interface MobileLearningRepositorySnapshot {
  words: WordEntry[];
  memoryMap: Record<string, MemoryState>;
  serverRev: number;
  lastSyncAt: string | null;
  dirty: boolean;
}

export class MobileLearningRepository implements MobileLearningRepositoryPort {
  private readonly clock: () => number;
  private words: WordEntry[] = [];
  private memoryMap: Record<string, MemoryState> = {};
  private serverRev = 1;
  private lastSyncAt: string | null = null;
  private dirty = false;

  /**
   * @param clock 現在時刻を返す関数（ms）。テストで固定時刻を注入できる。
   *              省略時は Date.now を使用する。
   */
  constructor(clock: () => number = Date.now) {
    this.clock = clock;
    this.seed();
  }

  listWords(query: WordListQuery): WordListResult {
    const q = query.q?.trim().toLowerCase();
    const tagSet = query.tags && query.tags.length > 0 ? new Set(query.tags) : null;
    const filtered = this.words.filter((word) => {
      if (query.pos && word.pos !== query.pos) {
        return false;
      }
      if (tagSet && !word.tags.some((tag) => tagSet.has(tag))) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        word.headword.toLowerCase().includes(q)
        || word.meaningJa.toLowerCase().includes(q)
        || word.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });

    return {
      words: filtered,
      memoryMap: this.memoryMap,
      total: filtered.length,
    };
  }

  getWord(wordId: string): WordEntry | null {
    return this.words.find((word) => word.id === wordId) ?? null;
  }

  getCard(wordId: string): StudyCard | null {
    const word = this.getWord(wordId);
    if (!word) return null;
    return { word, memory: this.memoryMap[wordId] ?? this.createMemory(wordId) };
  }

  createWord(draft: WordDraft): WordEntry {
    const timestamp = new Date(this.clock()).toISOString();
    const word: WordEntry = {
      ...draft,
      id: generateUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.words.unshift(word);
    this.memoryMap[word.id] = this.createMemory(word.id);
    this.markDirty();
    return word;
  }

  updateWord(wordId: string, draft: WordDraft): WordEntry {
    const idx = this.words.findIndex((word) => word.id === wordId);
    if (idx < 0) {
      throw new Error("Word not found");
    }

    const current = this.words[idx];
    const updated: WordEntry = {
      ...current,
      ...draft,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date(this.clock()).toISOString(),
    };

    this.words[idx] = updated;
    this.markDirty();
    return updated;
  }

  deleteWord(wordId: string): void {
    this.words = this.words.filter((word) => word.id !== wordId);
    delete this.memoryMap[wordId];
    this.markDirty();
  }

  resetMemory(wordId: string): void {
    if (!this.memoryMap[wordId]) {
      return;
    }
    this.memoryMap[wordId] = this.createMemory(wordId);
    this.markDirty();
  }

  listTags(): string[] {
    return [...new Set(this.words.flatMap((word) => word.tags))].sort();
  }

  nextCard(tags?: string[]): StudyCard | null {
    const tagSet = new Set(tags ?? []);
    const candidates = this.words.filter((word) => {
      if (tagSet.size === 0) {
        return true;
      }
      return word.tags.some((tag) => tagSet.has(tag));
    });

    if (candidates.length === 0) {
      return null;
    }

    const sorted = candidates
      .map((word) => ({ word, memory: this.memoryMap[word.id] ?? this.createMemory(word.id) }))
      .sort((a, b) => Date.parse(a.memory.dueAt) - Date.parse(b.memory.dueAt));

    return sorted[0];
  }

  gradeCard(wordId: string, rating: Rating): MemoryState {
    const current = this.memoryMap[wordId] ?? this.createMemory(wordId);
    const intervalDays = nextIntervalByRating(rating, current.intervalDays);
    const now = this.clock();

    const next: MemoryState = {
      ...current,
      memoryLevel: rating === "again" ? Math.max(0, current.memoryLevel - 1) : current.memoryLevel + 1,
      intervalDays,
      dueAt: new Date(now + intervalDays * DAY_MS).toISOString(),
      lastRating: rating,
      lastReviewedAt: new Date(now).toISOString(),
      lapseCount: rating === "again" ? current.lapseCount + 1 : current.lapseCount,
      reviewCount: current.reviewCount + 1,
    };

    this.memoryMap[wordId] = next;
    this.markDirty();
    return next;
  }

  getSyncStatus(): SyncStatus {
    return {
      online: true,
      dirty: this.dirty,
      lastSyncAt: this.lastSyncAt,
      clientId: "mobile-local-client",
      serverRev: this.serverRev,
    };
  }

  exportVocabFile(): VocabFile {
    return {
      schemaVersion: 1,
      words: this.words,
      memory: Object.values(this.memoryMap),
      updatedAt: new Date(this.clock()).toISOString(),
    };
  }

  importVocabFile(file: VocabFile, mode: "merge" | "overwrite"): void {
    if (mode === "overwrite") {
      const memoryMap = file.memory.reduce<Record<string, MemoryState>>((acc, state) => {
        acc[state.wordId] = state;
        return acc;
      }, {});
      this.words = file.words;
      this.memoryMap = memoryMap;
    } else {
      // merge: add only words not already present by ID
      const existingIds = new Set(this.words.map((w) => w.id));
      for (const word of file.words) {
        if (!existingIds.has(word.id)) {
          this.words.unshift(word);
          existingIds.add(word.id);
        }
      }
      const existingMemoryIds = new Set(Object.keys(this.memoryMap));
      for (const mem of file.memory) {
        if (!existingMemoryIds.has(mem.wordId)) {
          this.memoryMap[mem.wordId] = mem;
        }
      }
    }
    this.markDirty();
  }

  applyServerFile(file: VocabFile, serverRev: number, syncedAt: string): void {
    const memoryMap = file.memory.reduce<Record<string, MemoryState>>((acc, state) => {
      acc[state.wordId] = state;
      return acc;
    }, {});

    this.words = file.words;
    this.memoryMap = memoryMap;
    this.serverRev = serverRev;
    this.lastSyncAt = syncedAt;
    this.dirty = false;
  }

  markSynced(serverRev: number, syncedAt: string): void {
    this.serverRev = serverRev;
    this.lastSyncAt = syncedAt;
    this.dirty = false;
  }

  sync(): SyncResult {
    this.serverRev += 1;
    this.lastSyncAt = new Date(this.clock()).toISOString();
    this.dirty = false;

    return {
      status: "success",
      serverRev: this.serverRev,
      updatedAt: this.lastSyncAt,
    };
  }

  resolveConflict(strategy: ConflictResolution): SyncSuccess {
    void strategy;
    this.serverRev += 1;
    this.lastSyncAt = new Date(this.clock()).toISOString();
    this.dirty = false;
    return {
      status: "success",
      serverRev: this.serverRev,
      updatedAt: this.lastSyncAt,
    };
  }

  exportSnapshot(): MobileLearningRepositorySnapshot {
    return {
      words: this.words,
      memoryMap: this.memoryMap,
      serverRev: this.serverRev,
      lastSyncAt: this.lastSyncAt,
      dirty: this.dirty,
    };
  }

  importSnapshot(snapshot: MobileLearningRepositorySnapshot): void {
    this.words = snapshot.words;
    this.memoryMap = snapshot.memoryMap;
    this.serverRev = snapshot.serverRev;
    this.lastSyncAt = snapshot.lastSyncAt;
    this.dirty = snapshot.dirty;
  }

  private markDirty(): void {
    this.dirty = true;
  }

  private createMemory(wordId: string): MemoryState {
    return {
      wordId,
      memoryLevel: 0,
      ease: 2.5,
      intervalDays: 1,
      dueAt: new Date(this.clock()).toISOString(),
      lastRating: null,
      lastReviewedAt: null,
      lapseCount: 0,
      reviewCount: 0,
    };
  }

  private seed(): void {
    const first = this.createWord({
      headword: "ubiquitous",
      pronunciation: "juːˈbɪkwɪtəs",
      pos: "adj",
      meaningJa: "いたるところに存在する",
      examples: [{ id: generateUUID(), en: "Smartphones are ubiquitous.", ja: "スマートフォンはどこにでもある。", source: null }],
      tags: ["daily", "advanced"],
      memo: "Useful for essays",
    });
    const second = this.createWord({
      headword: "meticulous",
      pronunciation: "məˈtɪkjʊləs",
      pos: "adj",
      meaningJa: "細部まで注意深い",
      examples: [{ id: generateUUID(), en: "She is meticulous about notes.", ja: "彼女はノートを几帳面に取る。", source: null }],
      tags: ["writing"],
      memo: null,
    });
    this.memoryMap[first.id] = this.createMemory(first.id);
    this.memoryMap[second.id] = this.createMemory(second.id);
    this.dirty = false;
  }
}

export class PersistedMobileLearningRepository implements MobileLearningRepositoryPort {
  private readonly repository: MobileLearningRepository;
  private readonly storage: StorageAdapter;

  private constructor(repository: MobileLearningRepository, storage: StorageAdapter) {
    this.repository = repository;
    this.storage = storage;
  }

  static async create(
    storage: StorageAdapter,
    clock?: () => number,
  ): Promise<PersistedMobileLearningRepository> {
    const repository = new MobileLearningRepository(clock);
    const instance = new PersistedMobileLearningRepository(repository, storage);
    await instance.hydrate();
    return instance;
  }

  listWords(query: WordListQuery): WordListResult {
    return this.repository.listWords(query);
  }

  getWord(wordId: string): WordEntry | null {
    return this.repository.getWord(wordId);
  }

  getCard(wordId: string): StudyCard | null {
    return this.repository.getCard(wordId);
  }

  createWord(draft: WordDraft): WordEntry {
    const created = this.repository.createWord(draft);
    void this.persist();
    return created;
  }

  updateWord(wordId: string, draft: WordDraft): WordEntry {
    const updated = this.repository.updateWord(wordId, draft);
    void this.persist();
    return updated;
  }

  deleteWord(wordId: string): void {
    this.repository.deleteWord(wordId);
    void this.persist();
  }

  resetMemory(wordId: string): void {
    this.repository.resetMemory(wordId);
    void this.persist();
  }

  listTags(): string[] {
    return this.repository.listTags();
  }

  nextCard(tags?: string[]): StudyCard | null {
    return this.repository.nextCard(tags);
  }

  gradeCard(wordId: string, rating: Rating): MemoryState {
    const state = this.repository.gradeCard(wordId, rating);
    void this.persist();
    return state;
  }

  getSyncStatus(): SyncStatus {
    return this.repository.getSyncStatus();
  }

  exportVocabFile(): VocabFile {
    return this.repository.exportVocabFile();
  }

  importVocabFile(file: VocabFile, mode: "merge" | "overwrite"): void {
    this.repository.importVocabFile(file, mode);
    void this.persist();
  }

  applyServerFile(file: VocabFile, serverRev: number, syncedAt: string): void {
    this.repository.applyServerFile(file, serverRev, syncedAt);
    void this.persist();
  }

  markSynced(serverRev: number, syncedAt: string): void {
    this.repository.markSynced(serverRev, syncedAt);
    void this.persist();
  }

  sync(): SyncResult {
    const result = this.repository.sync();
    void this.persist();
    return result;
  }

  resolveConflict(strategy: ConflictResolution): SyncSuccess {
    const result = this.repository.resolveConflict(strategy);
    void this.persist();
    return result;
  }

  private async hydrate(): Promise<void> {
    try {
      const serialized = await this.storage.get(MOBILE_REPOSITORY_STORAGE_KEY);
      if (!serialized) {
        await this.persist();
        return;
      }

      const snapshot = JSON.parse(serialized) as MobileLearningRepositorySnapshot;
      this.repository.importSnapshot(snapshot);
    } catch {
      await this.persist();
    }
  }

  private async persist(): Promise<void> {
    const serialized = JSON.stringify(this.repository.exportSnapshot());
    await this.storage.set(MOBILE_REPOSITORY_STORAGE_KEY, serialized);
  }
}
