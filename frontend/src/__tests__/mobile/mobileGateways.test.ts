import { describe, expect, it, vi } from "vitest";
import { createMobileExamplesGateway } from "../../../apps/mobile/src/infra/mobileExamplesGateway";
import { createMobileIoGateway } from "../../../apps/mobile/src/infra/mobileIoGateway";
import { createMobileStudyGateway } from "../../../apps/mobile/src/infra/mobileStudyGateway";
import { createMobileWordGateway } from "../../../apps/mobile/src/infra/mobileWordGateway";
import type { MobileLearningRepositoryPort } from "../../../apps/mobile/src/domain/mobileLearningRepository.types";
import type { WordEntry, MemoryState } from "../../api/types";
import type { StudyCard } from "../../core/study/studyGateway";
import type { VocabFile } from "../../db/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeWord(id: string, extras: Partial<WordEntry> = {}): WordEntry {
  return {
    id,
    headword: `word-${id}`,
    pronunciation: null,
    pos: "noun",
    meaningJa: `意味-${id}`,
    examples: [],
    tags: [],
    memo: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...extras,
  };
}

function makeMemoryState(wordId: string): MemoryState {
  return {
    wordId,
    memoryLevel: 0,
    ease: 2.5,
    intervalDays: 1,
    dueAt: "2026-01-01T00:00:00.000Z",
    lastRating: null,
    lastReviewedAt: null,
    lapseCount: 0,
    reviewCount: 0,
  };
}

function makeCard(wordId: string): StudyCard {
  return {
    word: makeWord(wordId),
    memory: makeMemoryState(wordId),
  };
}

function makeVocabFile(words: WordEntry[] = []): VocabFile {
  return {
    schemaVersion: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    words,
    memory: [],
  };
}

function createRepoMock(
  overrides: Partial<MobileLearningRepositoryPort> = {},
): MobileLearningRepositoryPort {
  return {
    listWords: vi.fn(() => ({ words: [], memoryMap: {}, total: 0 })),
    getWord: vi.fn(() => null),
    getCard: vi.fn(() => null),
    createWord: vi.fn(),
    updateWord: vi.fn(),
    deleteWord: vi.fn(),
    resetMemory: vi.fn(),
    listTags: vi.fn(() => []),
    nextCard: vi.fn(() => null),
    gradeCard: vi.fn(() => makeMemoryState("w1")),
    getSyncStatus: vi.fn(() => ({
      online: false,
      dirty: false,
      lastSyncAt: null,
      clientId: "test",
      serverRev: 1,
    })),
    exportVocabFile: vi.fn(() => makeVocabFile()),
    importVocabFile: vi.fn(),
    applyServerFile: vi.fn(),
    markSynced: vi.fn(),
    sync: vi.fn(),
    resolveConflict: vi.fn(),
    ...overrides,
  };
}

// ── mobileExamplesGateway ─────────────────────────────────────────────────────

describe("createMobileExamplesGateway", () => {
  it("getTags delegates to repository.listTags", async () => {
    const repo = createRepoMock({ listTags: vi.fn(() => ["tag-a", "tag-b"]) });
    const gateway = createMobileExamplesGateway(repo);
    expect(await gateway.getTags()).toEqual(["tag-a", "tag-b"]);
  });

  it("next returns null when no examples exist", async () => {
    const repo = createRepoMock({
      listWords: vi.fn(() => ({
        words: [makeWord("w1")],
        memoryMap: {},
        total: 1,
      })),
    });
    const gateway = createMobileExamplesGateway(repo);
    expect(await gateway.next([], null, undefined)).toBeNull();
  });

  it("next advances sequentially when lastExampleId is provided", async () => {
    const word = makeWord("w1", {
      examples: [
        { id: "ex1", en: "Hello", ja: "こんにちは", source: null },
        { id: "ex2", en: "World", ja: "世界", source: null },
        { id: "ex3", en: "Foo", ja: "フー", source: null },
      ],
    });
    const repo = createRepoMock({
      listWords: vi.fn(() => ({ words: [word], memoryMap: {}, total: 1 })),
    });
    const gateway = createMobileExamplesGateway(repo);

    const next = await gateway.next([], "ex1", undefined);
    expect(next?.id).toBe("ex2");

    const next2 = await gateway.next([], "ex2", undefined);
    expect(next2?.id).toBe("ex3");
  });

  it("next wraps around to first example after the last one", async () => {
    const word = makeWord("w1", {
      examples: [
        { id: "ex1", en: "A", ja: null, source: null },
        { id: "ex2", en: "B", ja: null, source: null },
      ],
    });
    const repo = createRepoMock({
      listWords: vi.fn(() => ({ words: [word], memoryMap: {}, total: 1 })),
    });
    const gateway = createMobileExamplesGateway(repo);

    const next = await gateway.next([], "ex2", undefined);
    expect(next?.id).toBe("ex1");
  });

  it("next restricts to preferredWordId's examples when they exist", async () => {
    const w1 = makeWord("w1", {
      examples: [{ id: "ex-w1", en: "from w1", ja: null, source: null }],
    });
    const w2 = makeWord("w2", {
      examples: [{ id: "ex-w2", en: "from w2", ja: null, source: null }],
    });
    const repo = createRepoMock({
      listWords: vi.fn(() => ({ words: [w1, w2], memoryMap: {}, total: 2 })),
    });
    const gateway = createMobileExamplesGateway(repo);

    const result = await gateway.next([], null, "w2");
    expect(result?.id).toBe("ex-w2");
    expect(result?.word.id).toBe("w2");
  });

  it("next falls back to all examples when preferredWordId has none", async () => {
    const w1 = makeWord("w1", {
      examples: [{ id: "ex-w1", en: "from w1", ja: null, source: null }],
    });
    const w2 = makeWord("w2"); // no examples
    const repo = createRepoMock({
      listWords: vi.fn(() => ({ words: [w1, w2], memoryMap: {}, total: 2 })),
    });
    const gateway = createMobileExamplesGateway(repo);

    // preferredWordId=w2 has no examples → should fall back to all (only w1 has examples)
    const result = await gateway.next([], null, "w2");
    expect(result?.word.id).toBe("w1");
  });

  it("next filters by tags when provided", async () => {
    const word = makeWord("w1", {
      tags: ["vocab"],
      examples: [{ id: "ex1", en: "test", ja: null, source: null }],
    });
    const repo = createRepoMock({
      listWords: vi.fn(() => ({ words: [word], memoryMap: {}, total: 1 })),
    });
    const gateway = createMobileExamplesGateway(repo);

    await gateway.next(["vocab"], null, undefined);
    expect(repo.listWords).toHaveBeenCalledWith({ tags: ["vocab"] });
  });

  it("next passes undefined tags when empty array is provided", async () => {
    const repo = createRepoMock({
      listWords: vi.fn(() => ({ words: [], memoryMap: {}, total: 0 })),
    });
    const gateway = createMobileExamplesGateway(repo);

    await gateway.next([], null, undefined);
    expect(repo.listWords).toHaveBeenCalledWith({ tags: undefined });
  });
});

// ── mobileStudyGateway ───────────────────────────────────────────────────────

describe("createMobileStudyGateway", () => {
  it("getTags delegates to repository.listTags", async () => {
    const repo = createRepoMock({ listTags: vi.fn(() => ["n", "v"]) });
    const gateway = createMobileStudyGateway(repo);
    expect(await gateway.getTags()).toEqual(["n", "v"]);
  });

  it("next with preferredWordId returns that card directly", async () => {
    const card = makeCard("w1");
    const repo = createRepoMock({ getCard: vi.fn(() => card) });
    const gateway = createMobileStudyGateway(repo);

    const result = await gateway.next([], "w1");
    expect(result).toBe(card);
    expect(repo.getCard).toHaveBeenCalledWith("w1");
    expect(repo.nextCard).not.toHaveBeenCalled();
  });

  it("next with preferredWordId falls back to nextCard when card is null", async () => {
    const fallbackCard = makeCard("w2");
    const repo = createRepoMock({
      getCard: vi.fn(() => null),
      nextCard: vi.fn(() => fallbackCard),
    });
    const gateway = createMobileStudyGateway(repo);

    const result = await gateway.next(["tag"], "w1");
    expect(result).toBe(fallbackCard);
    expect(repo.nextCard).toHaveBeenCalledWith(["tag"]);
  });

  it("next without preferredWordId uses nextCard with tags", async () => {
    const card = makeCard("w3");
    const repo = createRepoMock({ nextCard: vi.fn(() => card) });
    const gateway = createMobileStudyGateway(repo);

    const result = await gateway.next(["tag-a"], undefined);
    expect(result).toBe(card);
    expect(repo.nextCard).toHaveBeenCalledWith(["tag-a"]);
    expect(repo.getCard).not.toHaveBeenCalled();
  });

  it("grade delegates to repository.gradeCard", async () => {
    const memory = makeMemoryState("w1");
    const repo = createRepoMock({ gradeCard: vi.fn(() => memory) });
    const gateway = createMobileStudyGateway(repo);

    const result = await gateway.grade("w1", "good");
    expect(result).toBe(memory);
    expect(repo.gradeCard).toHaveBeenCalledWith("w1", "good");
  });
});

// ── mobileIoGateway ──────────────────────────────────────────────────────────

describe("createMobileIoGateway", () => {
  it("exportData returns structured AppData from repository", () => {
    const words = [makeWord("w1"), makeWord("w2")];
    const file = makeVocabFile(words);
    const repo = createRepoMock({ exportVocabFile: vi.fn(() => file) });
    const gateway = createMobileIoGateway(repo);

    const result = gateway.exportData();

    expect(result.schemaVersion).toBe(1);
    expect(result.words).toBe(words);
    expect(result.memory).toEqual([]);
    expect(typeof result.exportedAt).toBe("string");
  });

  it("importData calls importVocabFile with normalized vocab file (merge)", () => {
    const repo = createRepoMock();
    const gateway = createMobileIoGateway(repo);

    gateway.importData(
      {
        schemaVersion: 1,
        words: [
          {
            headword: "test",
            pos: "noun",
            meaningJa: "テスト",
            examples: [],
          },
        ],
      },
      "merge",
    );

    expect(repo.importVocabFile).toHaveBeenCalledOnce();
    const [calledFile, calledMode] = (repo.importVocabFile as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(calledMode).toBe("merge");
    expect(calledFile.words).toHaveLength(1);
    expect(calledFile.words[0].headword).toBe("test");
    // UUID should be auto-generated
    expect(typeof calledFile.words[0].id).toBe("string");
    expect(calledFile.words[0].id).toHaveLength(36);
  });

  it("importData calls importVocabFile with overwrite mode", () => {
    const repo = createRepoMock();
    const gateway = createMobileIoGateway(repo);

    gateway.importData({ schemaVersion: 1, words: [] }, "overwrite");

    const [, calledMode] = (repo.importVocabFile as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(calledMode).toBe("overwrite");
  });

  it("importData preserves existing IDs from import data", () => {
    const repo = createRepoMock();
    const gateway = createMobileIoGateway(repo);

    gateway.importData(
      {
        schemaVersion: 1,
        words: [
          {
            id: "existing-id-123",
            headword: "preserve",
            pos: "verb",
            meaningJa: "保持",
            examples: [{ id: "ex-id-456", en: "example", ja: null }],
          },
        ],
      },
      "merge",
    );

    const [calledFile] = (repo.importVocabFile as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(calledFile.words[0].id).toBe("existing-id-123");
    expect(calledFile.words[0].examples[0].id).toBe("ex-id-456");
  });

  it("importData throws when words is not an array", () => {
    const repo = createRepoMock();
    const gateway = createMobileIoGateway(repo);

    expect(() =>
      gateway.importData({ schemaVersion: 1, words: null as unknown as [] }, "merge"),
    ).toThrow("Invalid import data: 'words' must be an array");
  });

  it("importData normalizes memory states with defaults", () => {
    const repo = createRepoMock();
    const gateway = createMobileIoGateway(repo);

    gateway.importData(
      {
        schemaVersion: 1,
        words: [{ id: "w1", headword: "test", pos: "noun", meaningJa: "テスト", examples: [] }],
        memory: [{ wordId: "w1" }],
      },
      "merge",
    );

    const [calledFile] = (repo.importVocabFile as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(calledFile.memory[0].wordId).toBe("w1");
    expect(calledFile.memory[0].memoryLevel).toBe(0);
    expect(calledFile.memory[0].ease).toBe(2.5);
    expect(calledFile.memory[0].intervalDays).toBe(0);
  });
});

// ── mobileWordGateway ─────────────────────────────────────────────────────────

describe("createMobileWordGateway", () => {
  it("exportWords returns AppData structure with all words and memory", async () => {
    const words = [makeWord("w1"), makeWord("w2")];
    const mem = makeMemoryState("w1");
    const repo = createRepoMock({
      listWords: vi.fn(() => ({
        words,
        memoryMap: { "w1": mem },
        total: words.length,
      })),
    });
    const gateway = createMobileWordGateway(repo);

    const result = await gateway.exportWords();

    expect(result.schemaVersion).toBe(1);
    expect(result.words).toBe(words);
    expect(result.memory).toEqual([mem]);
    expect(typeof result.exportedAt).toBe("string");
  });

  it("getTags returns sorted unique tags across all words", async () => {
    const repo = createRepoMock({
      listWords: vi.fn(() => ({
        words: [
          makeWord("w1", { tags: ["zzz", "aaa"] }),
          makeWord("w2", { tags: ["aaa", "mmm"] }),
        ],
        memoryMap: {},
        total: 2,
      })),
    });
    const gateway = createMobileWordGateway(repo);

    const tags = await gateway.getTags();

    expect(tags).toEqual(["aaa", "mmm", "zzz"]);
  });

  it("getTags returns empty array when no words have tags", async () => {
    const repo = createRepoMock({
      listWords: vi.fn(() => ({ words: [makeWord("w1")], memoryMap: {}, total: 1 })),
    });
    const gateway = createMobileWordGateway(repo);
    expect(await gateway.getTags()).toEqual([]);
  });
});
