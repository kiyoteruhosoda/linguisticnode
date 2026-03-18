import type { FormEvent } from "react";
import type { ExampleTestItem } from "../../api/types";
import { RnwButton } from "./RnwButton";

type FeedbackState = "correct" | "incorrect" | null;

export interface RnwExamplesQuizCardProps {
  example: ExampleTestItem;
  blankedSentence: string;
  actualWordInSentence: string | null;
  userInput: string;
  feedback: FeedbackState;
  showAnswer: boolean;
  showWordInfo: boolean;
  showTranslation: boolean;
  canSpeak: boolean;
  onShowWordInfo: () => void;
  onToggleTranslation: () => void;
  onSpeakSentence: () => void;
  onSpeakAnswer: () => void;
  onGoToStudy: () => void;
  onInputChange: (value: string) => void;
  onSubmitAnswer: () => void;
  onNext: () => void;
}

const containerStyle = {
  border: "1px solid #dee2e6",
  borderRadius: 8,
  backgroundColor: "#fff",
  boxShadow: "0 0.125rem 0.25rem rgba(0,0,0,0.075)",
  padding: 16,
  display: "flex",
  flexDirection: "column" as const,
  gap: 16,
};

const answerBoxStyle = {
  border: "1px solid #cfe2ff",
  borderRadius: 6,
  backgroundColor: "#e7f1ff",
  padding: 12,
};

const feedbackBoxByTone = {
  correct: {
    border: "1px solid #badbcc",
    backgroundColor: "#d1e7dd",
    color: "#0f5132",
  },
  incorrect: {
    border: "1px solid #f5c2c7",
    backgroundColor: "#f8d7da",
    color: "#842029",
  },
  skipped: {
    border: "1px solid #f5c2c7",
    backgroundColor: "#f8d7da",
    color: "#842029",
  },
} as const;

export function RnwExamplesQuizCard({
  example,
  blankedSentence,
  actualWordInSentence,
  userInput,
  feedback,
  showAnswer,
  showWordInfo,
  showTranslation,
  canSpeak,
  onShowWordInfo,
  onToggleTranslation,
  onSpeakSentence,
  onSpeakAnswer,
  onGoToStudy,
  onInputChange,
  onSubmitAnswer,
  onNext,
}: RnwExamplesQuizCardProps) {
  const feedbackTone = feedback === "correct" ? "correct" : userInput.trim() ? "incorrect" : "skipped";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmitAnswer();
  }

  return (
    <section style={containerStyle} data-testid="rnw-examples-quiz-card">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {!showWordInfo ? (
          <RnwButton
            type="button"
            kind="outline"
            tone="secondary"
            size="sm"
            onPress={onShowWordInfo}
            icon={<i className="fa-solid fa-circle-info" aria-hidden="true" />}
            label="Show Word Info"
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ background: "#6c757d", color: "#fff", borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
              {example.word.pos}
            </span>
            <span style={{ fontWeight: 500 }}>{example.word.meaningJa}</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ fontSize: 20, fontWeight: 500, flex: 1 }}>{blankedSentence}</div>
        <RnwButton
          type="button"
          kind="outline"
          tone="secondary"
          size="sm"
          onPress={onSpeakSentence}
          icon={<i className="fa-solid fa-volume-high" aria-hidden="true" />}
          title="Speak"
          disabled={!canSpeak || !showAnswer}
        />
      </div>

      {example.ja ? (
        <div>
          {!showTranslation ? (
            <RnwButton
              type="button"
              kind="outline"
              tone="secondary"
              size="sm"
              onPress={onToggleTranslation}
              icon={<i className="fa-solid fa-language" aria-hidden="true" />}
              label="Show Translation"
            />
          ) : (
            <div style={{ color: "#6c757d", fontSize: 13 }}>
              <i className="fa-solid fa-language" aria-hidden="true" /> {example.ja}
            </div>
          )}
        </div>
      ) : null}

      {!showAnswer ? (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Type the missing word... (or leave empty to skip)"
              value={userInput}
              onChange={(event) => onInputChange(event.target.value)}
              autoFocus
              style={{ flex: 1, border: "1px solid #ced4da", borderRadius: 6, padding: "8px 10px" }}
            />
            <RnwButton
              type="submit"
              kind="solid"
              tone="primary"
              icon={<i className="fa-solid fa-check" aria-hidden="true" />}
              label="Check"
            />
          </div>
          <div style={{ color: "#6c757d", fontSize: 12 }}>Press Enter to check or skip if you don&apos;t know</div>
        </form>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ ...feedbackBoxByTone[feedbackTone], borderRadius: 6, padding: 12 }}>
            <div style={{ fontWeight: 600 }}>
              {feedback === "correct" ? "Correct!" : userInput.trim() ? "Incorrect" : "Skipped"}
            </div>
            {userInput.trim() ? (
              <div style={{ fontSize: 13 }}>Your answer: <strong>{userInput}</strong></div>
            ) : null}
          </div>

          <div style={answerBoxStyle}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Correct Answer:</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 20, flex: 1 }}>
                <strong>{actualWordInSentence || example.word.headword}</strong>
              </div>
              <RnwButton
                type="button"
                kind="outline"
                tone="secondary"
                size="sm"
                onPress={onSpeakAnswer}
                icon={<i className="fa-solid fa-volume-high" aria-hidden="true" />}
                title="Speak Correct Answer"
                disabled={!canSpeak}
              />
            </div>
            {actualWordInSentence && actualWordInSentence !== example.word.headword ? (
              <div style={{ color: "#6c757d", fontSize: 13 }}>(Base form: {example.word.headword})</div>
            ) : null}
            <div style={{ color: "#6c757d", fontSize: 13, marginTop: 8 }}>Complete sentence: {example.en}</div>
          </div>

          <RnwButton
            type="button"
            kind="outline"
            tone="secondary"
            onPress={onGoToStudy}
            icon={<i className="fa-solid fa-layer-group" aria-hidden="true" />}
            label="Open in Study"
            fullWidth
          />

          <RnwButton
            type="button"
            kind="solid"
            tone="primary"
            onPress={onNext}
            icon={<i className="fa-solid fa-arrow-right" aria-hidden="true" />}
            label="Next Example"
            fullWidth
          />
        </div>
      )}
    </section>
  );
}
