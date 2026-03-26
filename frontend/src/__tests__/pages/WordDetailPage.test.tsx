import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { WordDetailPage } from "../../pages/WordDetailPage";

vi.mock("../../word/wordApplication", () => ({
  wordApplicationService: {
    getWord: vi.fn(),
    updateWord: vi.fn(),
    deleteWord: vi.fn(),
    resetWordMemory: vi.fn(),
  },
}));

import { wordApplicationService } from "../../word/wordApplication";

describe("WordDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders RNW action group for reset/delete actions", async () => {
    vi.mocked(wordApplicationService.getWord).mockResolvedValue({
      id: "w-1",
      headword: "apple",
      pronunciation: undefined,
      entries: [{ pos: "noun", meanings: [{ meaningJa: "りんご", tags: [], examples: [] }] }],
      memo: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    render(
      <MemoryRouter initialEntries={["/words/w-1"]}>
        <Routes>
          <Route path="/words/:id" element={<WordDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("rnw-word-detail-action-group")).toBeInTheDocument();
      expect(screen.getByTestId("rnw-word-detail-reset")).toBeInTheDocument();
      expect(screen.getByTestId("rnw-word-detail-delete")).toBeInTheDocument();
    });
  });
});
