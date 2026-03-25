import { describe, expect, it } from "vitest";
import { MobileLearningRepository, PersistedMobileLearningRepository } from "../../../apps/mobile/src/domain/mobileLearningRepository";
import type { StorageAdapter } from "../../core/storage";

// ── helpers ──────────────────────────────────────────────────────────────────

class InMemoryStorageAdapter implements StorageAdapter {
  private readonly store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  async keys(): Promise<string[]> {
    return [...this.store.keys()];
  }
}

const FIXED_MS = new Date("2026-01-01T00:00:00.000Z").getTime();

function makeRepo() {
  return new MobileLearningRepository(() => FIXED_MS);
}

const DRAFT = {
  headword: "serendipity",
  pronunciation: { notation: "ˌsɛrənˈdɪpɪti" },
  entries: [
    {
      pos: "noun" as const,
      meanings: [{ meaningJa: "思いがけない幸運", tags: ["daily"], examples: [] }],
    },
  ],
  memo: null,
};

// ── PersistedMobileLearningRepository ────────────────────────────────────────

describe("PersistedMobileLearningRepository", () => {
  it("persists created words and restores state on next initialization", async () => {
    const storage = new InMemoryStorageAdapter();
    const firstRepo = await PersistedMobileLearningRepository.create(storage);

    const created = firstRepo.createWord({
      headword: "resilient",
      pronunciation: { notation: "rɪˈzɪliənt" },
      entries: [{ pos: "adj", meanings: [{ meaningJa: "回復力のある", tags: ["mobile"], examples: [] }] }],
      memo: null,
    });

    await Promise.resolve();

    const restoredRepo = await PersistedMobileLearningRepository.create(storage);
    const restored = restoredRepo.getWord(created.id);

    expect(restored?.headword).toBe("resilient");
    expect(restoredRepo.listWords({ q: "resilient" }).total).toBe(1);
  });

  it("keeps deterministic seed state for in-memory repository", () => {
    const repo = new MobileLearningRepository();

    const listed = repo.listWords({});

    expect(listed.total).toBeGreaterThanOrEqual(2);
    expect(Object.keys(listed.memoryMap)).toHaveLength(listed.total);
  });

  it("falls back to seed data when storage contains corrupt JSON", async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.set("mobile.learning-repository.v1", "not-valid-json{{");

    const repo = await PersistedMobileLearningRepository.create(storage);

    expect(repo.listWords({}).total).toBeGreaterThanOrEqual(2);
  });
});

// ── MobileLearningRepository: listWords ──────────────────────────────────────

describe("MobileLearningRepository listWords", () => {
  it("returns all words when query is empty", () => {
    const repo = makeRepo();
    const { total } = repo.listWords({});
    expect(total).toBeGreaterThanOrEqual(2);
  });

  it("filters by headword query (case-insensitive)", () => {
    const repo = makeRepo();
    repo.createWord({ ...DRAFT, headword: "Ubiquitous" });
    const result = repo.listWords({ q: "ubiq" });
    expect(result.words.every((w) => w.headword.toLowerCase().includes("ubiq"))).toBe(true);
  });

  it("filters by meaningJa query", () => {
    const repo = makeRepo();
    repo.createWord({ headword: "testword-unique", pronunciation: undefined, entries: [{ pos: "noun" as const, meanings: [{ meaningJa: "テスト専用", tags: [], examples: [] }] }], memo: null });
    const result = repo.listWords({ q: "テスト専用" });
    expect(result.words.some((w) => w.entries.some((e) => e.meanings.some((m) => m.meaningJa === "テスト専用")))).toBe(true);
  });

  it("filters by tag query", () => {
    const repo = makeRepo();
    repo.createWord({ headword: "tagword-unique", pronunciation: undefined, entries: [{ pos: "noun" as const, meanings: [{ meaningJa: "タグ", tags: ["unique-tag-xyz"], examples: [] }] }], memo: null });
    const result = repo.listWords({ q: "unique-tag-xyz" });
    expect(result.words.some((w) => w.entries.some((e) => e.meanings.some((m) => m.tags?.includes("unique-tag-xyz"))))).toBe(true);
  });

  it("filters by pos", () => {
    const repo = makeRepo();
    repo.createWord({ headword: "verbword-unique", pronunciation: undefined, entries: [{ pos: "verb" as const, meanings: [{ meaningJa: "動詞", tags: [], examples: [] }] }], memo: null });
    const result = repo.listWords({ pos: "verb" });
    expect(result.words.every((w) => w.entries.some((e) => e.pos === "verb"))).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  it("filters by tags array (OR match)", () => {
    const repo = makeRepo();
    repo.createWord({ headword: "alpha-word", pronunciation: undefined, entries: [{ pos: "noun" as const, meanings: [{ meaningJa: "アルファ", tags: ["alpha"], examples: [] }] }], memo: null });
    repo.createWord({ headword: "beta-word", pronunciation: undefined, entries: [{ pos: "noun" as const, meanings: [{ meaningJa: "ベータ", tags: ["beta"], examples: [] }] }], memo: null });
    const result = repo.listWords({ tags: ["alpha"] });
    expect(result.words.every((w) => w.entries.some((e) => e.meanings.some((m) => m.tags?.some((t) => ["alpha"].includes(t)))))).toBe(true);
  });

  it("returns zero results for query that matches nothing", () => {
    const repo = makeRepo();
    expect(repo.listWords({ q: "zzznomatch999" }).total).toBe(0);
  });

  it("includes memoryMap in result", () => {
    const repo = makeRepo();
    const { memoryMap, total } = repo.listWords({});
    expect(Object.keys(memoryMap)).toHaveLength(total);
  });

  it("trims whitespace from query", () => {
    const repo = makeRepo();
    const withSpace = repo.listWords({ q: "  ubiquitous  " });
    const withoutSpace = repo.listWords({ q: "ubiquitous" });
    expect(withSpace.total).toBe(withoutSpace.total);
  });
});

// ── MobileLearningRepository: getWord / getCard ───────────────────────────────

describe("MobileLearningRepository getWord / getCard", () => {
  it("getWord returns null for unknown ID", () => {
    expect(makeRepo().getWord("no-such-id")).toBeNull();
  });

  it("getCard returns null for unknown ID", () => {
    expect(makeRepo().getCard("no-such-id")).toBeNull();
  });

  it("getCard returns card with memory for known word", () => {
    const repo = makeRepo();
    const word = repo.createWord(DRAFT);
    const card = repo.getCard(word.id);
    expect(card?.word.id).toBe(word.id);
    expect(card?.memory.wordId).toBe(word.id);
  });
});

// ── MobileLearningRepository: updateWord ─────────────────────────────────────

describe("MobileLearningRepository updateWord", () => {
  it("updates headword and meaningJa", () => {
    const repo = makeRepo();
    const word = repo.createWord(DRAFT);
    const updatedDraft = { ...DRAFT, headword: "updated", entries: [{ pos: "noun" as const, meanings: [{ meaningJa: "更新済み", tags: ["daily"], examples: [] }] }] };
    const updated = repo.updateWord(word.id, updatedDraft);
    expect(updated.headword).toBe("updated");
    expect(updated.entries[0].meanings[0].meaningJa).toBe("更新済み");
  });

  it("preserves id and createdAt", () => {
    const repo = makeRepo();
    const word = repo.createWord(DRAFT);
    const updated = repo.updateWord(word.id, { ...DRAFT, headword: "changed" });
    expect(updated.id).toBe(word.id);
    expect(updated.createdAt).toBe(word.createdAt);
  });

  it("marks dirty after update", () => {
    const repo = makeRepo();
    const word = repo.createWord(DRAFT);
    repo.markSynced(1, "2026-01-01T00:00:00.000Z");
    repo.updateWord(word.id, { ...DRAFT, headword: "changed" });
    expect(repo.getSyncStatus().dirty).toBe(true);
  });

  it("throws when word is not found", () => {
    expect(() => makeRepo().updateWord("no-such-id", DRAFT)).toThrow("Word not found");
  });
});

// ── MobileLearningRepository: deleteWord ─────────────────────────────────────

describe("MobileLearningRepository deleteWord", () => {
  it("removes word from list", () => {
    const repo = makeRepo();
    const word = repo.createWord(DRAFT);
    expect(repo.listWords({ q: "serendipity" }).total).toBeGreaterThanOrEqual(1);
    repo.deleteWord(word.id);
    expect(repo.getWord(word.id)).toBeNull();
  });

  it("removes corresponding memory entry", () => {
    const repo = makeRepo();
    const word = repo.createWord(DRAFT);
    repo.deleteWord(word.id);
    const { memoryMap } = repo.listWords({});
    expect(memoryMap[word.id]).toBeUndefined();
  });
});

// ── MobileLearningRepository: resetMemory ────────────────────────────────────

describe("MobileLearningRepository resetMemory", () => {
  it("resets memory state to defaults after grading", () => {
    const repo = makeRepo();
    const word = repo.createWord(DRAFT);
    repo.gradeCard(word.id, "easy");
    const before = repo.listWords({}).memoryMap[word.id];
    expect(before.reviewCount).toBe(1);

    repo.resetMemory(word.id);

    const after = repo.listWords({}).memoryMap[word.id];
    expect(after.reviewCount).toBe(0);
    expect(after.memoryLevel).toBe(0);
  });

  it("is a no-op for unknown wordId (no throw)", () => {
    expect(() => makeRepo().resetMemory("no-such-id")).not.toThrow();
  });
});

// ── MobileLearningRepository: listTags ───────────────────────────────────────

describe("MobileLearningRepository listTags", () => {
  it("returns sorted unique tags across all words", () => {
    const repo = makeRepo();
    repo.createWord({ headword: "tag-word-1", pronunciation: undefined, entries: [{ pos: "noun" as const, meanings: [{ meaningJa: "タグ語1", tags: ["zzz", "aaa"], examples: [] }] }], memo: null });
    repo.createWord({ headword: "tag-word-2", pronunciation: undefined, entries: [{ pos: "noun" as const, meanings: [{ meaningJa: "タグ語2", tags: ["aaa", "mmm"], examples: [] }] }], memo: null });
    const tags = repo.listTags();
    expect(tags).toEqual([...tags].sort());
    const unique = new Set(tags);
    expect(unique.size).toBe(tags.length);
  });
});

// ── MobileLearningRepository: nextCard ───────────────────────────────────────

describe("MobileLearningRepository nextCard", () => {
  it("returns null when no words exist matching tags", () => {
    const repo = new MobileLearningRepository(() => FIXED_MS);
    // override seed words by importing an empty overwrite
    repo.importVocabFile({ schemaVersion: 1, words: [], memory: [], updatedAt: "2026-01-01T00:00:00.000Z" }, "overwrite");
    expect(repo.nextCard(["nonexistent-tag"])).toBeNull();
  });

  it("returns earliest due card when no tag filter", () => {
    const repo = makeRepo();
    // grade a word to push its dueAt far in the future
    const words = repo.listWords({}).words;
    repo.gradeCard(words[0].id, "easy"); // pushed far out
    const card = repo.nextCard();
    // the other word should be due sooner
    expect(card?.word.id).not.toBe(words[0].id);
  });

  it("filters by tags", () => {
    const repo = makeRepo();
    repo.createWord({ headword: "only-tag-word", pronunciation: undefined, entries: [{ pos: "noun" as const, meanings: [{ meaningJa: "専用タグ語", tags: ["only-tag"], examples: [] }] }], memo: null });
    const card = repo.nextCard(["only-tag"]);
    expect(card?.word.entries.some((e) => e.meanings.some((m) => m.tags?.includes("only-tag")))).toBe(true);
  });
});

// ── MobileLearningRepository: gradeCard (spaced repetition) ──────────────────

describe("MobileLearningRepository gradeCard", () => {
  it("'again' sets intervalDays=1, decrements memoryLevel, increments lapseCount", () => {
    const repo = makeRepo();
    const word = repo.createWord(DRAFT);
    // Grade 'good' first so memoryLevel > 0
    repo.gradeCard(word.id, "good");
    const result = repo.gradeCard(word.id, "again");

    expect(result.intervalDays).toBe(1);
    expect(result.memoryLevel).toBe(0); // was 1 after good, decremented to 0
    expect(result.lapseCount).toBe(1);
    expect(result.reviewCount).toBe(2);
  });

  it("'again' does not decrement memoryLevel below 0", () => {
    const repo = makeRepo();
    const word = repo.createWord(DRAFT);
    const result = repo.gradeCard(word.id, "again");
    expect(result.memoryLevel).toBe(0);
  });

  it("'hard' multiplies interval by ~1.2", () => {
    const repo = makeRepo();
    const word = repo.createWord(DRAFT);
    // initial intervalDays = 1
    const result = repo.gradeCard(word.id, "hard");
    expect(result.intervalDays).toBe(Math.max(1, Math.round(1 * 1.2))); // = 1
    expect(result.memoryLevel).toBe(1);
    expect(result.lapseCount).toBe(0);
  });

  it("'good' doubles interval", () => {
    const repo = makeRepo();
    const word = repo.createWord(DRAFT);
    const result = repo.gradeCard(word.id, "good");
    expect(result.intervalDays).toBe(Math.max(1, Math.round(1 * 2))); // = 2
    expect(result.memoryLevel).toBe(1);
  });

  it("'easy' triples interval with minimum of 2", () => {
    const repo = makeRepo();
    const word = repo.createWord(DRAFT);
    const result = repo.gradeCard(word.id, "easy");
    expect(result.intervalDays).toBe(Math.max(2, Math.round(1 * 3))); // = 3
    expect(result.memoryLevel).toBe(1);
  });

  it("increments reviewCount for every rating", () => {
    const repo = makeRepo();
    const word = repo.createWord(DRAFT);
    repo.gradeCard(word.id, "good");
    repo.gradeCard(word.id, "good");
    const result = repo.gradeCard(word.id, "easy");
    expect(result.reviewCount).toBe(3);
  });

  it("uses injected clock for lastReviewedAt and dueAt", () => {
    const fixedMs = new Date("2026-03-01T00:00:00.000Z").getTime();
    const repo = new MobileLearningRepository(() => fixedMs);
    const word = repo.createWord(DRAFT);
    const result = repo.gradeCard(word.id, "good");

    expect(result.lastReviewedAt).toBe("2026-03-01T00:00:00.000Z");
    // good → intervalDays = 2, dueAt = 2026-03-03
    expect(result.dueAt).toBe("2026-03-03T00:00:00.000Z");
  });
});

// ── MobileLearningRepository: importVocabFile merge mode ─────────────────────

describe("MobileLearningRepository importVocabFile", () => {
  it("merge: adds only new words (skips existing IDs)", () => {
    const repo = makeRepo();
    const existing = repo.createWord(DRAFT);
    const before = repo.listWords({}).total;

    repo.importVocabFile(
      {
        schemaVersion: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
        words: [
          // duplicate
          {
            ...existing,
            createdAt: existing.createdAt ?? "2026-01-01T00:00:00.000Z",
            updatedAt: existing.updatedAt ?? "2026-01-01T00:00:00.000Z",
          },
          // new
          {
            id: "brand-new-id",
            headword: "new-word",
            pronunciation: undefined,
            entries: [{ pos: "noun" as const, meanings: [{ meaningJa: "新しい", tags: [], examples: [] }] }],
            memo: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        memory: [],
      },
      "merge",
    );

    expect(repo.listWords({}).total).toBe(before + 1);
    expect(repo.getWord("brand-new-id")?.headword).toBe("new-word");
  });

  it("merge: skips words with same headword+pos even when ID differs (re-import of ID-less file)", () => {
    const repo = makeRepo();
    repo.importVocabFile(
      {
        schemaVersion: 2,
        updatedAt: "2026-01-01T00:00:00.000Z",
        words: [
          {
            id: "first-import-id",
            headword: "serendipity",
            pronunciation: undefined,
            entries: [{ pos: "noun", meanings: [{ meaningJa: "思いがけない幸運", tags: [], examples: [] }] }],
            memo: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        memory: [],
      },
      "merge",
    );
    const afterFirst = repo.listWords({}).total;

    // Same file re-imported but with a different ID (as if ID was absent and regenerated)
    repo.importVocabFile(
      {
        schemaVersion: 2,
        updatedAt: "2026-01-01T00:00:00.000Z",
        words: [
          {
            id: "second-import-id",
            headword: "serendipity",
            pronunciation: undefined,
            entries: [{ pos: "noun", meanings: [{ meaningJa: "思いがけない幸運", tags: [], examples: [] }] }],
            memo: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        memory: [],
      },
      "merge",
    );

    expect(repo.listWords({}).total).toBe(afterFirst);
  });

  it("merge: adds only new memory entries (skips existing wordIds)", () => {
    const repo = makeRepo();
    const word = repo.createWord(DRAFT);
    repo.gradeCard(word.id, "easy"); // has memory now

    const beforeLevel = repo.listWords({}).memoryMap[word.id].memoryLevel;

    repo.importVocabFile(
      {
        schemaVersion: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
        words: [],
        memory: [
          // existing wordId → should be ignored
          {
            wordId: word.id,
            memoryLevel: 99,
            ease: 1.0,
            intervalDays: 999,
            dueAt: "2026-01-01T00:00:00.000Z",
            lastRating: null,
            lastReviewedAt: null,
            lapseCount: 0,
            reviewCount: 0,
          },
        ],
      },
      "merge",
    );

    expect(repo.listWords({}).memoryMap[word.id].memoryLevel).toBe(beforeLevel);
  });

  it("overwrite: replaces all words and memory", () => {
    const repo = makeRepo();
    repo.importVocabFile(
      {
        schemaVersion: 2,
        updatedAt: "2026-01-01T00:00:00.000Z",
        words: [
          {
            id: "only-word",
            headword: "overwrite",
            pronunciation: undefined,
            entries: [{ pos: "noun", meanings: [{ meaningJa: "上書き", tags: [], examples: [] }] }],
            memo: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        memory: [],
      },
      "overwrite",
    );

    const { words } = repo.listWords({});
    expect(words).toHaveLength(1);
    expect(words[0].id).toBe("only-word");
  });
});

// ── MobileLearningRepository: applyServerFile ────────────────────────────────

describe("MobileLearningRepository applyServerFile", () => {
  it("replaces state with server data and clears dirty flag", () => {
    const repo = makeRepo();
    repo.createWord(DRAFT); // marks dirty

    repo.applyServerFile(
      {
        schemaVersion: 2,
        updatedAt: "2026-06-01T00:00:00.000Z",
        words: [
          {
            id: "server-word",
            headword: "server",
            pronunciation: undefined,
            entries: [{ pos: "noun", meanings: [{ meaningJa: "サーバー", tags: [], examples: [] }] }],
            memo: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        memory: [],
      },
      42,
      "2026-06-01T00:00:00.000Z",
    );

    const status = repo.getSyncStatus();
    expect(repo.getWord("server-word")?.headword).toBe("server");
    expect(status.serverRev).toBe(42);
    expect(status.lastSyncAt).toBe("2026-06-01T00:00:00.000Z");
    expect(status.dirty).toBe(false);
  });
});
