/**
 * RnwFlashCard のテスト
 *
 * 音声白画面修正の核心:
 *   - コンポーネントがアンマウントされたとき (= ページ遷移) に
 *     speechApplicationService.stop() が呼ばれること
 *   - userSelect: "text" が除去されていること（長押しメニュー競合防止）
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RnwFlashCard } from "../../rnw/components/RnwFlashCard";
import * as speechApplication from "../../speech/speechApplication";
import type { MemoryState, WordEntry } from "../../api/types";

const mockWord: WordEntry = {
  id: "w1",
  headword: "fluent",
  pos: "adj",
  meaningJa: "流暢な",
  examples: [
    { id: "e1", en: "She speaks fluent French.", ja: "彼女は流暢なフランス語を話す。", source: null },
  ],
  tags: [],
  memo: null,
  pronunciation: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockMemory: MemoryState = {
  wordId: "w1",
  memoryLevel: 2,
  ease: 2.5,
  intervalDays: 3,
  dueAt: "2024-01-04T00:00:00Z",
  lastRating: null,
  lastReviewedAt: null,
  lapseCount: 0,
  reviewCount: 1,
};

beforeEach(() => {
  // speechSynthesis をモック
  window.speechSynthesis = {
    speaking: false,
    pending: false,
    paused: false,
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn().mockReturnValue([]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onvoiceschanged: null,
  } as unknown as SpeechSynthesis;

  (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance = class {
    lang = "";
    onstart: (() => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    constructor(public text: string) {}
  };
});

describe("RnwFlashCard — 音声白画面修正", () => {
  it("アンマウント時に speechApplicationService.stop() が呼ばれる（ページ遷移で音声を止める）", () => {
    const stopSpy = vi.spyOn(speechApplication.speechApplicationService, "stop");

    const { unmount } = render(
      <RnwFlashCard
        word={mockWord}
        memory={mockMemory}
        onRate={vi.fn().mockResolvedValue(undefined)}
        onOpenExamples={vi.fn()}
      />,
    );

    // ページ遷移をシミュレート（コンポーネントのアンマウント）
    unmount();

    expect(stopSpy).toHaveBeenCalledTimes(1);
    stopSpy.mockRestore();
  });

  it("音声再生中にアンマウントしても speechSynthesis.cancel() が呼ばれる", () => {
    // speaking 状態のモック
    window.speechSynthesis = {
      ...window.speechSynthesis,
      speaking: true,
      cancel: vi.fn(),
    } as unknown as SpeechSynthesis;

    const { unmount } = render(
      <RnwFlashCard
        word={mockWord}
        memory={mockMemory}
        onRate={vi.fn().mockResolvedValue(undefined)}
        onOpenExamples={vi.fn()}
      />,
    );

    unmount();

    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });
});

describe("RnwFlashCard — userSelect 除去（長押しメニュー競合防止）", () => {
  it("headword に userSelect:text が設定されていない", () => {
    render(
      <RnwFlashCard
        word={mockWord}
        memory={mockMemory}
        onRate={vi.fn().mockResolvedValue(undefined)}
        onOpenExamples={vi.fn()}
      />,
    );

    const headword = screen.getByText("fluent");
    // userSelect: text が設定されていたら長押しでテキスト選択が発動し自作メニューと競合する
    expect(headword).not.toHaveStyle({ userSelect: "text" });
  });

  it("回答後の meaningJa に userSelect:text が設定されていない", () => {
    render(
      <RnwFlashCard
        word={mockWord}
        memory={mockMemory}
        onRate={vi.fn().mockResolvedValue(undefined)}
        onOpenExamples={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Show Answer"));

    const meaning = screen.getByText("流暢な");
    expect(meaning).not.toHaveStyle({ userSelect: "text" });
  });

  it("回答後の例文英語に userSelect:text が設定されていない", () => {
    render(
      <RnwFlashCard
        word={mockWord}
        memory={mockMemory}
        onRate={vi.fn().mockResolvedValue(undefined)}
        onOpenExamples={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Show Answer"));

    const exampleEn = screen.getByText("She speaks fluent French.");
    expect(exampleEn).not.toHaveStyle({ userSelect: "text" });
  });
});
