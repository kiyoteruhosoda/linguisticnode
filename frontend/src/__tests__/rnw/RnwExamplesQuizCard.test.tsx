import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RnwExamplesQuizCard } from "../../rnw/components/RnwExamplesQuizCard";
import type { ExampleTestItem } from "../../api/types";

const example: ExampleTestItem = {
  id: "example-1",
  en: "I travel to work by train.",
  ja: "私は電車で通勤します。",
  word: {
    id: "word-1",
    headword: "travel",
    meaningJa: "旅行する",
    pos: "verb",
    tags: [],
  },
};

function defaultProps(overrides: Partial<Parameters<typeof RnwExamplesQuizCard>[0]> = {}) {
  return {
    example,
    blankedSentence: "I _______ to work by train.",
    actualWordInSentence: "travel",
    userInput: "",
    feedback: null,
    showAnswer: false,
    showWordInfo: false,
    showTranslation: false,
    canSpeak: true,
    onShowWordInfo: vi.fn(),
    onToggleTranslation: vi.fn(),
    onSpeakSentence: vi.fn(),
    onSpeakAnswer: vi.fn(),
    onGoToStudy: vi.fn(),
    onInputChange: vi.fn(),
    onSubmitAnswer: vi.fn(),
    onNext: vi.fn(),
    ...overrides,
  } as Parameters<typeof RnwExamplesQuizCard>[0];
}

describe("RnwExamplesQuizCard", () => {
  it("renders quiz card and forwards answer submission", async () => {
    const user = userEvent.setup();
    const onSubmitAnswer = vi.fn();

    render(<RnwExamplesQuizCard {...defaultProps({ onSubmitAnswer })} />);

    expect(screen.getByTestId("rnw-examples-quiz-card")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /check/i }));
    expect(onSubmitAnswer).toHaveBeenCalledTimes(1);
  });

  it("shows correct answer actions and fires callbacks", async () => {
    const user = userEvent.setup();
    const onSpeakAnswer = vi.fn();
    const onGoToStudy = vi.fn();

    render(
      <RnwExamplesQuizCard
        {...defaultProps({
          userInput: "travel",
          feedback: "correct",
          showAnswer: true,
          onSpeakAnswer,
          onGoToStudy,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open in Study" }));
    await user.click(screen.getByRole("button", { name: "Speak Correct Answer" }));

    expect(onGoToStudy).toHaveBeenCalledTimes(1);
    expect(onSpeakAnswer).toHaveBeenCalledTimes(1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // fillの英文は答えが出るので、回答後のみに制限する — テストシナリオ
  // ──────────────────────────────────────────────────────────────────────────

  it("回答前: 読み上げボタンが disabled になっている（答えが音声で漏れない）", () => {
    const onSpeakSentence = vi.fn();

    render(<RnwExamplesQuizCard {...defaultProps({ showAnswer: false, onSpeakSentence })} />);

    const speakBtn = screen.getByRole("button", { name: "Speak" });
    expect(speakBtn).toBeDisabled();
  });

  it("回答前: 読み上げボタンをクリックしても onSpeakSentence が呼ばれない", async () => {
    const user = userEvent.setup();
    const onSpeakSentence = vi.fn();

    render(<RnwExamplesQuizCard {...defaultProps({ showAnswer: false, onSpeakSentence })} />);

    // disabled なのでクリック不可だが、念のため試みる
    const speakBtn = screen.getByRole("button", { name: "Speak" });
    await user.click(speakBtn);

    expect(onSpeakSentence).not.toHaveBeenCalled();
  });

  it("回答後 (showAnswer=true): 読み上げボタンが有効になる", () => {
    render(<RnwExamplesQuizCard {...defaultProps({ showAnswer: true, feedback: "correct" })} />);

    const speakBtn = screen.getByRole("button", { name: "Speak" });
    expect(speakBtn).not.toBeDisabled();
  });

  it("回答後: 読み上げボタンを押すと onSpeakSentence が呼ばれる", async () => {
    const user = userEvent.setup();
    const onSpeakSentence = vi.fn();

    render(
      <RnwExamplesQuizCard
        {...defaultProps({ showAnswer: true, feedback: "correct", onSpeakSentence })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Speak" }));
    expect(onSpeakSentence).toHaveBeenCalledTimes(1);
  });

  it("canSpeak=false のとき回答後でも読み上げボタンは disabled", () => {
    render(
      <RnwExamplesQuizCard
        {...defaultProps({ showAnswer: true, canSpeak: false, feedback: "correct" })}
      />,
    );

    const speakBtn = screen.getByRole("button", { name: "Speak" });
    expect(speakBtn).toBeDisabled();
  });
});
