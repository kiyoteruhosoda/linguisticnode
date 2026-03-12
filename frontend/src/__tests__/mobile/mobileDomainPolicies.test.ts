import { describe, expect, it } from "vitest";
import {
  filterByPreferredWord,
  selectNextExample,
} from "../../../apps/mobile/src/domain/exampleNavigationPolicy";
import { normalizeVocabFileForImport } from "../../../apps/mobile/src/domain/vocabFileNormalizer";
import { MobileLearningRepository } from "../../../apps/mobile/src/domain/mobileLearningRepository";
import { generateUUID } from "../../../apps/mobile/src/domain/mobileUuid";
import type { ExampleTestItem } from "../../api/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeItem(id: string, wordId: string): ExampleTestItem {
  return {
    id,
    en: `sentence-${id}`,
    ja: null,
    source: null,
    word: {
      id: wordId,
      headword: `word-${wordId}`,
      pronunciation: null,
      pos: "n",
      meaningJa: `意味-${wordId}`,
      tags: [],
    },
  };
}

// ── generateUUID ─────────────────────────────────────────────────────────────

describe("generateUUID", () => {
  const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it("generates a valid UUID v4 string", () => {
    expect(generateUUID()).toMatch(UUID_V4_PATTERN);
  });

  it("generates unique values on each call", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateUUID()));
    expect(ids.size).toBe(100);
  });
});

// ── exampleNavigationPolicy ───────────────────────────────────────────────────

describe("filterByPreferredWord", () => {
  it("restricts to the preferred word's items when they exist", () => {
    const items = [makeItem("ex1", "w1"), makeItem("ex2", "w2"), makeItem("ex3", "w2")];
    const result = filterByPreferredWord(items, "w2");
    expect(result.map((i) => i.id)).toEqual(["ex2", "ex3"]);
  });

  it("returns all items unchanged when preferred word has no matches", () => {
    const items = [makeItem("ex1", "w1"), makeItem("ex2", "w2")];
    const result = filterByPreferredWord(items, "w-unknown");
    expect(result).toBe(items);
  });
});

describe("selectNextExample", () => {
  it("returns null for empty list", () => {
    expect(selectNextExample([], null)).toBeNull();
  });

  it("advances sequentially when lastExampleId is given", () => {
    const items = [makeItem("ex1", "w1"), makeItem("ex2", "w1"), makeItem("ex3", "w1")];
    expect(selectNextExample(items, "ex1")?.id).toBe("ex2");
    expect(selectNextExample(items, "ex2")?.id).toBe("ex3");
  });

  it("wraps around to the first item after the last one", () => {
    const items = [makeItem("ex1", "w1"), makeItem("ex2", "w1")];
    expect(selectNextExample(items, "ex2")?.id).toBe("ex1");
  });

  it("uses injected random function for initial selection", () => {
    const items = [makeItem("ex1", "w1"), makeItem("ex2", "w1"), makeItem("ex3", "w1")];
    // random() returning 0.9 → floor(0.9 * 3) = 2 → items[2]
    expect(selectNextExample(items, null, () => 0.9)?.id).toBe("ex3");
    // random() returning 0.1 → floor(0.1 * 3) = 0 → items[0]
    expect(selectNextExample(items, null, () => 0.1)?.id).toBe("ex1");
  });

  it("treats unknown lastExampleId as index -1 and advances to items[0]", () => {
    // currentIdx = -1, nextIdx = 0 → items[0]
    const items = [makeItem("ex1", "w1"), makeItem("ex2", "w1")];
    expect(selectNextExample(items, "no-such-id")?.id).toBe("ex1");
  });
});

// ── vocabFileNormalizer ───────────────────────────────────────────────────────

describe("normalizeVocabFileForImport", () => {
  it("assigns UUID to words and examples missing IDs", () => {
    const result = normalizeVocabFileForImport({
      schemaVersion: 1,
      words: [
        {
          headword: "test",
          pos: "n",
          meaningJa: "テスト",
          examples: [{ en: "example sentence", ja: null }],
        },
      ],
    });

    expect(result.words[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(result.words[0].examples[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("preserves existing IDs", () => {
    const result = normalizeVocabFileForImport({
      schemaVersion: 1,
      words: [
        {
          id: "existing-word-id",
          headword: "test",
          pos: "n",
          meaningJa: "テスト",
          examples: [{ id: "existing-ex-id", en: "example", ja: null }],
        },
      ],
    });

    expect(result.words[0].id).toBe("existing-word-id");
    expect(result.words[0].examples[0].id).toBe("existing-ex-id");
  });

  it("uses injected generateId for deterministic testing", () => {
    let counter = 0;
    const generateId = () => `id-${++counter}`;

    const result = normalizeVocabFileForImport(
      {
        schemaVersion: 1,
        words: [
          { headword: "a", pos: "n", meaningJa: "a", examples: [{ en: "ex", ja: null }] },
          { headword: "b", pos: "n", meaningJa: "b", examples: [] },
        ],
      },
      { generateId },
    );

    expect(result.words[0].id).toBe("id-1");
    expect(result.words[0].examples[0].id).toBe("id-2");
    expect(result.words[1].id).toBe("id-3");
  });

  it("uses injected now for deterministic timestamps", () => {
    const fixedNow = "2026-01-01T00:00:00.000Z";

    const result = normalizeVocabFileForImport(
      {
        schemaVersion: 1,
        words: [{ headword: "test", pos: "n", meaningJa: "テスト", examples: [] }],
      },
      { now: fixedNow },
    );

    expect(result.words[0].createdAt).toBe(fixedNow);
    expect(result.words[0].updatedAt).toBe(fixedNow);
    expect(result.updatedAt).toBe(fixedNow);
  });

  it("applies default MemoryState values for sparse memory entries", () => {
    const result = normalizeVocabFileForImport({
      schemaVersion: 1,
      words: [],
      memory: [{ wordId: "w1" }],
    });

    const mem = result.memory[0];
    expect(mem.wordId).toBe("w1");
    expect(mem.memoryLevel).toBe(0);
    expect(mem.ease).toBe(2.5);
    expect(mem.intervalDays).toBe(0);
    expect(mem.lapseCount).toBe(0);
    expect(mem.reviewCount).toBe(0);
  });

  it("preserves existing MemoryState values", () => {
    const result = normalizeVocabFileForImport({
      schemaVersion: 1,
      words: [],
      memory: [
        {
          wordId: "w1",
          memoryLevel: 3,
          ease: 3.0,
          intervalDays: 7,
          dueAt: "2026-06-01T00:00:00.000Z",
          lastRating: "good",
          lapseCount: 1,
          reviewCount: 5,
        },
      ],
    });

    const mem = result.memory[0];
    expect(mem.memoryLevel).toBe(3);
    expect(mem.ease).toBe(3.0);
    expect(mem.intervalDays).toBe(7);
    expect(mem.dueAt).toBe("2026-06-01T00:00:00.000Z");
    expect(mem.reviewCount).toBe(5);
  });
});

// ── MobileLearningRepository (clock injection) ────────────────────────────────

describe("MobileLearningRepository clock injection", () => {
  it("uses injected clock for createdAt and updatedAt timestamps", () => {
    const fixedMs = new Date("2026-03-01T12:00:00.000Z").getTime();
    const repo = new MobileLearningRepository(() => fixedMs);

    const word = repo.createWord({
      headword: "clock-test",
      pronunciation: null,
      pos: "n",
      meaningJa: "時計テスト",
      examples: [],
      tags: [],
      memo: null,
    });

    expect(word.createdAt).toBe("2026-03-01T12:00:00.000Z");
    expect(word.updatedAt).toBe("2026-03-01T12:00:00.000Z");
  });

  it("uses injected clock for gradeCard timestamps", () => {
    const fixedMs = new Date("2026-03-15T00:00:00.000Z").getTime();
    const repo = new MobileLearningRepository(() => fixedMs);
    const word = repo.createWord({
      headword: "grade-test",
      pronunciation: null,
      pos: "n",
      meaningJa: "採点テスト",
      examples: [],
      tags: [],
      memo: null,
    });

    const result = repo.gradeCard(word.id, "good");

    expect(result.lastReviewedAt).toBe("2026-03-15T00:00:00.000Z");
  });

  it("two repos with different clocks produce different timestamps for same operation", () => {
    const ms1 = new Date("2026-01-01T00:00:00.000Z").getTime();
    const ms2 = new Date("2026-06-01T00:00:00.000Z").getTime();

    const repo1 = new MobileLearningRepository(() => ms1);
    const repo2 = new MobileLearningRepository(() => ms2);

    const draft = {
      headword: "timing",
      pronunciation: null,
      pos: "n" as const,
      meaningJa: "タイミング",
      examples: [],
      tags: [],
      memo: null,
    };

    expect(repo1.createWord(draft).createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(repo2.createWord(draft).createdAt).toBe("2026-06-01T00:00:00.000Z");
  });
});
