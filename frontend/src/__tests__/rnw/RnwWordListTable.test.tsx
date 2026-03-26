import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MemoryState, WordEntry } from "../../api/types";
import { RnwWordListTable } from "../../rnw/components/RnwWordListTable";

describe("RnwWordListTable", () => {
  it("renders words and navigates by selected row", () => {
    const words: WordEntry[] = [
      {
        id: "word-1",
        headword: "hello",
        pronunciation: undefined,
        entries: [
          {
            pos: "noun",
            meanings: [
              {
                meaningJa: "こんにちは",
                tags: [],
                examples: [{ id: "ex-1", en: "Hello world", ja: "こんにちは世界", source: null }],
              },
            ],
          },
        ],
        memo: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ];

    const memoryMap: Record<string, MemoryState> = {
      "word-1": {
        wordId: "word-1",
        memoryLevel: 3,
        ease: 2.5,
        intervalDays: 1,
        dueAt: "2024-01-02T00:00:00Z",
        lapseCount: 0,
        reviewCount: 0,
      },
    };

    const onSelectWord = vi.fn();

    render(
      <RnwWordListTable
        items={words}
        memoryMap={memoryMap}
        onSelectWord={onSelectWord}
      />,
    );

    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByText("こんにちは")).toBeInTheDocument();
    expect(screen.getByText("Lv 3")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("rnw-word-row-word-1"));
    expect(onSelectWord).toHaveBeenCalledWith("word-1");
  });
});
