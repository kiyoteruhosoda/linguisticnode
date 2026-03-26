import { describe, expect, it, vi } from "vitest";
import { WordApplicationService } from "../../core/word/wordApplicationService";
import type { Pos } from "../../api/types";
import type { WordGateway } from "../../core/word/wordGateway";

function createGatewayMock(): WordGateway {
  return {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    resetMemory: vi.fn(),
    exportWords: vi.fn(),
    getTags: vi.fn(),
  };
}

describe("WordApplicationService", () => {
  it("maps list result to UI view model", async () => {
    const gateway = createGatewayMock();
    const service = new WordApplicationService(gateway);

    const words = [
      {
        id: "w1",
        headword: "apple",
        pronunciation: undefined,
        entries: [{ pos: "noun" as Pos, meanings: [{ meaningJa: "りんご", tags: ["food"], examples: [] }] }],
        memo: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ];

    vi.mocked(gateway.list).mockResolvedValue({
      words,
      memoryMap: {
        w1: {
          wordId: "w1",
          memoryLevel: 1,
          ease: 2.5,
          intervalDays: 1,
          dueAt: "2024-01-02T00:00:00.000Z",
          lastRating: null,
          lastReviewedAt: null,
          lapseCount: 0,
          reviewCount: 0,
        },
      },
      total: 1,
    });

    const result = await service.listWords({ q: "app" });

    expect(gateway.list).toHaveBeenCalledWith({ q: "app" });
    expect(result.items).toEqual(words);
    expect(result.memoryMap.w1.wordId).toBe("w1");
  });

  it("returns tags through gateway", async () => {
    const gateway = createGatewayMock();
    const service = new WordApplicationService(gateway);

    vi.mocked(gateway.getTags).mockResolvedValue(["travel", "basic"]);

    await expect(service.getAllTags()).resolves.toEqual(["travel", "basic"]);
  });

  it("delegates create/update/delete/reset/export operations", async () => {
    const gateway = createGatewayMock();
    const service = new WordApplicationService(gateway);

    const draft = {
      headword: "book",
      pronunciation: undefined,
      entries: [{ pos: "noun" as Pos, meanings: [{ meaningJa: "本", tags: [], examples: [] }] }],
      memo: null,
    };

    vi.mocked(gateway.create).mockResolvedValue({
      ...draft,
      id: "w2",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });
    vi.mocked(gateway.update).mockResolvedValue({
      ...draft,
      id: "w2",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    });
    vi.mocked(gateway.exportWords).mockResolvedValue({
      schemaVersion: 1,
      exportedAt: "2024-01-01T00:00:00.000Z",
      words: [],
      memory: [],
    });

    await service.createWord(draft);
    await service.updateWord("w2", draft);
    await service.deleteWord("w2");
    await service.resetWordMemory("w2");
    const exported = await service.exportSnapshot();

    expect(gateway.create).toHaveBeenCalledWith(draft);
    expect(gateway.update).toHaveBeenCalledWith("w2", draft);
    expect(gateway.delete).toHaveBeenCalledWith("w2");
    expect(gateway.resetMemory).toHaveBeenCalledWith("w2");
    expect(exported.schemaVersion).toBe(1);
  });
});
