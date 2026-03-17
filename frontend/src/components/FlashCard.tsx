// frontend/src/components/FlashCard.tsx

import { useEffect, useMemo, useState } from "react";
import type { WordEntry, MemoryState, Rating } from "../api/types";

type Props = {
  word: WordEntry;
  memory: MemoryState;
  onRate: (rating: Rating) => Promise<void>;
};

export function FlashCard({ word, memory, onRate }: Props) {
  const [showAnswer, setShowAnswer] = useState(false);
  const canSpeak = useMemo(() => typeof window !== "undefined" && "speechSynthesis" in window, []);

  // Reset showAnswer when word changes
  useEffect(() => {
    setShowAnswer(false);
  }, [word.id]);

  // Wrapper to reset showAnswer before calling onRate
  async function handleRate(rating: Rating) {
    setShowAnswer(false);
    await onRate(rating);
  }

  function speak(e?: React.MouseEvent<HTMLButtonElement>) {
    if (!canSpeak) return;
    const ut = new SpeechSynthesisUtterance(word.headword);
    ut.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(ut);
    // Blur to remove focus/hover state on touch devices
    if (e) e.currentTarget.blur();
  }

  function speakExample(text: string, e?: React.MouseEvent<HTMLButtonElement>) {
    if (!canSpeak || !text.trim()) return;
    const ut = new SpeechSynthesisUtterance(text.trim());
    ut.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(ut);
    // Blur to remove focus/hover state on touch devices
    if (e) e.currentTarget.blur();
  }

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <i className="fa-solid fa-layer-group text-primary" />
          <span className="fw-semibold">Flash Card</span>
          <span className="badge text-bg-light ms-2">Lv {memory.memoryLevel}</span>
        </div>

        <button
          className="btn btn-outline-primary"
          style={{ width: "2.75rem", height: "2.75rem", padding: 0, flexShrink: 0 }}
          onClick={speak}
          disabled={!canSpeak}
          title="Speak"
        >
          <i className="fa-solid fa-volume-high" />
        </button>
      </div>

      <div className="card-body">
        <div className="text-center">
          <div className="display-6 fw-bold" style={{ userSelect: "text" }}>{word.headword}</div>
          <div className="mb-1">
            <span className="badge text-bg-secondary">{word.pos}</span>
          </div>
          <div className="text-secondary">
            due: <span className="mono">{new Date(memory.dueAt).toLocaleString()}</span>
          </div>
        </div>

        <hr />

        {!showAnswer ? (
          <div className="d-grid">
            <button className="btn btn-primary" onClick={() => setShowAnswer(true)}>
              Show Answer
            </button>
          </div>
        ) : (
          <div className="vstack gap-3">
            <div className="alert alert-light border">
              <div className="fw-semibold mb-1">Meaning (JA)</div>
              <div style={{ userSelect: "text" }}>{word.meaningJa}</div>
            </div>

            {word.examples?.length ? (
              <div className="alert alert-light border">
                <div className="fw-semibold mb-2">Examples</div>
                <div className="vstack gap-2">
                  {word.examples.map((example, idx) => (
                    <div key={idx} className="border-start border-3 border-primary ps-3">
                      <div className="d-flex align-items-start justify-content-between gap-2 mb-1">
                        <div className="flex-grow-1" style={{ userSelect: "text" }}>{example.en}</div>
                        <button
                          className="btn btn-outline-primary"
                          style={{ width: "2.75rem", height: "2.75rem", padding: 0, flexShrink: 0 }}
                          type="button"
                          onClick={(e) => speakExample(example.en, e)}
                          disabled={!canSpeak}
                          title="Speak example"
                        >
                          <i className="fa-solid fa-volume-high" />
                        </button>
                      </div>
                      {example.ja && (
                        <div className="text-secondary small" style={{ userSelect: "text" }}>{example.ja}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="row g-2 justify-content-center">
              <div className="col-6 col-md-3">
                <button
                  className="btn btn-outline-danger w-100"
                  onClick={() => void handleRate("again")}
                >
                  <i className="fa-solid fa-rotate-left me-1" /> Again
                </button>
              </div>

              <div className="col-6 col-md-3">
                <button
                  className="btn btn-outline-warning w-100"
                  onClick={() => void handleRate("hard")}
                >
                  <i className="fa-solid fa-hand me-1" /> Hard
                </button>
              </div>

              <div className="col-6 col-md-3">
                <button
                  className="btn btn-outline-primary w-100"
                  onClick={() => void handleRate("good")}
                >
                  <i className="fa-solid fa-thumbs-up me-1" /> Good
                </button>
              </div>

              <div className="col-6 col-md-3">
                <button
                  className="btn btn-outline-success w-100"
                  onClick={() => void handleRate("easy")}
                >
                  <i className="fa-solid fa-face-smile me-1" /> Easy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
