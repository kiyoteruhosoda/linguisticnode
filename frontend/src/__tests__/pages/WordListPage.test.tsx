import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { WordListPage } from "../../pages/WordListPage";

vi.mock("../../word/wordApplication", () => ({
  wordApplicationService: {
    listWords: vi.fn(),
    getAllTags: vi.fn(),
    exportSnapshot: vi.fn(),
  },
}));

vi.mock("../../components/SyncButton", () => ({
  default: () => <div data-testid="mock-sync-button" />,
}));

import { wordApplicationService } from "../../word/wordApplication";

describe("WordListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(wordApplicationService.getAllTags).mockResolvedValue(["travel", "business"]);
    vi.mocked(wordApplicationService.listWords).mockResolvedValue({
      items: [
        {
          id: "w1",
          headword: "apple",
          pronunciation: undefined,
          entries: [{ pos: "noun" as const, meanings: [{ meaningJa: "りんご", tags: ["travel"], examples: [] }] }],
          memo: null,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
      memoryMap: {},
    });
  });

  it("shows tag filter button and opens panel", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <WordListPage />
      </MemoryRouter>,
    );

    const tagButton = await screen.findByTestId("rnw-word-list-tags");
    await user.click(tagButton);

    expect(screen.getByTestId("rnw-study-tag-panel")).toBeInTheDocument();
    expect(screen.getByText("Filter by Tags")).toBeInTheDocument();
  });

  it("loads list using tag query when applying a filter", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <WordListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(wordApplicationService.listWords).toHaveBeenCalledWith({ q: "", tags: undefined });
    });

    await user.click(await screen.findByTestId("rnw-word-list-tags"));
    await user.click(screen.getByTestId("rnw-tag-chip-travel"));
    await user.click(screen.getByTestId("rnw-study-tag-apply"));

    await waitFor(() => {
      expect(wordApplicationService.listWords).toHaveBeenCalledWith({ q: "", tags: ["travel"] });
    });
  });
});
