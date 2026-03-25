// frontend/src/components/FlashCard.tsx

import { useEffect, useMemo, useState } from "react";
import type { WordEntry, MemoryState, Rating } from "../api/types";

type Props = {
  word: WordEntry;
  memory: MemoryState;
  onRate: (rating: Rating) => Promise<void>;
  appliedTags?: string[];
};

export function FlashCard({ word, memory, onRate, appliedTags = [] }: Props) {
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
    if (e) e.currentTarget.blur();
  }

  function speakExample(text: string, e?: React.MouseEvent<HTMLButtonElement>) {
    if (!canSpeak || !text.trim()) return;
    const ut = new SpeechSynthesisUtterance(text.trim());
    ut.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(ut);
    if (e) e.currentTarget.blur();
  }

  // Filtered entries for front face and summary
  const filteredEntries = appliedTags.length > 0
    ? word.entries.filter((e) =>
        e.meanings.some((m) => appliedTags.some((tag) => m.tags?.includes(tag)))
      )
    : word.entries;

  function getFilteredMeanings(entry: typeof word.entries[0]) {
    if (appliedTags.length === 0) return entry.meanings;
    return entry.meanings.filter((m) => appliedTags.some((tag) => m.tags?.includes(tag)));
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
        {/* Front face */}
        <div className="text-center mb-2">
          <div className="display-6 fw-bold" style={{ userSelect: "text" }}>{word.headword}</div>
          <div className="d-flex gap-1 justify-content-center mb-1 flex-wrap">
            {filteredEntries.map((e) => (
              <span key={e.pos} className="badge text-bg-secondary">{e.pos}</span>
            ))}
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
            {/* Summary section: filtered meanings */}
            <div className="alert alert-light border">
              <div className="fw-semibold mb-1">Meaning (JA)</div>
              {filteredEntries.map((entry) =>
                getFilteredMeanings(entry).map((meaning, mi) => (
                  <div key={`${entry.pos}-${mi}`} className="d-flex align-items-center gap-2 flex-wrap mb-1" style={{ userSelect: "text" }}>
                    <span>{meaning.meaningJa}</span>
                    {(meaning.tags ?? []).map((tag) => (
                      <span key={tag} className="badge text-bg-light">{tag}</span>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Detail section: all entries, all meanings */}
            <div className="alert alert-light border">
              {word.entries.map((entry) => (
                <div key={entry.pos} className="mb-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="fw-bold text-primary" style={{ fontSize: "0.75rem", letterSpacing: "0.05em" }}>
                      {entry.pos.toUpperCase()}
                    </span>
                    <hr className="flex-grow-1 m-0" />
                  </div>
                  {entry.meanings.map((meaning, mi) => (
                    <div key={mi} className="mb-2">
                      <div className="fw-semibold mb-1" style={{ userSelect: "text" }}>{meaning.meaningJa}</div>
                      {(meaning.tags ?? []).length > 0 && (
                        <div className="d-flex gap-1 flex-wrap mb-1">
                          {(meaning.tags ?? []).map((tag) => (
                            <span key={tag} className="badge text-bg-light">{tag}</span>
                          ))}
                        </div>
                      )}
                      {(meaning.examples ?? []).map((example, ei) => (
                        <div key={ei} className="border-start border-3 border-primary ps-3 mb-2">
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
                  ))}
                </div>
              ))}
            </div>

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
