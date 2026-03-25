import { describe, expect, it } from "vitest";
import type { WordEntry } from "../../api/types";
import {
  buildWordSaveDraft,
  createEmptyExample,
  normalizeExampleField,
  sanitizeExamples,
  parseTagsInput,
} from "../../core/word/wordDraftPolicy";

describe("wordDraftPolicy", () => {
  it("creates empty example using polymorphic id generator", () => {
    const example = createEmptyExample({ nextId: () => "id-1" });
    expect(example).toEqual({ id: "id-1", en: "", ja: null, source: null });
  });

  it("normalizes optional fields", () => {
    expect(normalizeExampleField("  source  ")).toBe("source");
    expect(normalizeExampleField("   ")).toBeNull();
    expect(normalizeExampleField(null)).toBeNull();
  });

  it("parses tags input with deduplication", () => {
    expect(parseTagsInput(" travel, business ,travel,  ")).toEqual(["travel", "business"]);
    expect(parseTagsInput(" ")).toEqual([]);
  });

  it("sanitizes examples and removes empty english rows", () => {
    const examples = sanitizeExamples([
      { id: "1", en: "  keep me  ", ja: "  訳  ", source: "  book " },
      { id: "2", en: "   ", ja: "  ", source: null },
    ]);

    expect(examples).toEqual([
      { id: "1", en: "keep me", ja: "訳", source: "book" },
    ]);
  });

  it("builds save draft for create mode", () => {
    const draft = buildWordSaveDraft(
      {
        headword: "  reach ",
        pos: "verb",
        meaningJa: " 到達する ",
        tagsInput: "verb, basic",
        memo: "  ",
        examples: [{ id: "1", en: " Reach here. ", ja: " ここに到達 ", source: " note " }],
      },
      null,
    );

    expect(draft).toEqual({
      headword: "reach",
      pronunciation: undefined,
      entries: [
        {
          pos: "verb",
          pronunciation: undefined,
          meanings: [
            {
              meaningJa: "到達する",
              tags: ["verb", "basic"],
              examples: [{ id: "1", en: "Reach here.", ja: "ここに到達", source: "note" }],
            },
          ],
        },
      ],
      memo: null,
    });
  });

  it("preserves initial metadata for edit mode", () => {
    const initial: WordEntry = {
      id: "w-1",
      headword: "reach",
      pronunciation: { notation: "riːtʃ" },
      entries: [
        { pos: "verb", meanings: [{ meaningJa: "届く", tags: ["travel"], examples: [] }] },
      ],
      memo: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    const draft = buildWordSaveDraft(
      {
        headword: "reaches",
        pos: "verb",
        meaningJa: "到達する",
        tagsInput: "updated, travel",
        memo: "memo",
        examples: [],
      },
      initial,
    );

    expect(draft.pronunciation).toEqual({ notation: "riːtʃ" });
    expect(draft.entries[0].meanings[0].tags).toEqual(["updated", "travel"]);
    expect(draft.memo).toBe("memo");
  });
});
