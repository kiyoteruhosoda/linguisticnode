// frontend/src/rnw/components/RnwFlashCard.tsx

import { useEffect, useMemo, useState } from "react";
import type { MemoryState, Rating, WordEntry } from "../../api/types";
import { speechApplicationService } from "../../speech/speechApplication";
import { RnwButton } from "./RnwButton";
import { RnwBadge } from "./RnwBadge";
import type { RnwButtonKind, RnwButtonTone } from "../theme/tokens";
import { RnwLevelBadge } from "./RnwLevelBadge";

export type RnwFlashCardProps = {
  word: WordEntry;
  memory: MemoryState;
  onRate: (rating: Rating) => Promise<void>;
  onOpenExamples: (wordId: string) => void;
  appliedTags?: string[];
};

const cardStyle = {
  border: "1px solid #dee2e6",
  borderRadius: 8,
  backgroundColor: "#fff",
  boxShadow: "0 0.125rem 0.25rem rgba(0,0,0,0.075)",
  overflow: "hidden",
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: 12,
  borderBottom: "1px solid #dee2e6",
};

const bodyStyle = {
  padding: 16,
  display: "flex",
  flexDirection: "column" as const,
  gap: 16,
};

const answerPanelStyle = {
  border: "1px solid #dee2e6",
  borderRadius: 8,
  backgroundColor: "#f8f9fa",
  padding: 12,
};

const ratingPalette: Record<
  Rating,
  { tone: RnwButtonTone; label: string; iconClass: string; kind?: RnwButtonKind }
> = {
  again: { tone: "danger", label: "Again", iconClass: "fa-solid fa-rotate-left", kind: "outline" },
  hard: { tone: "warning", label: "Hard", iconClass: "fa-solid fa-hand", kind: "outline" },
  good: { tone: "primary", label: "Good", iconClass: "fa-solid fa-thumbs-up", kind: "outline" },
  easy: { tone: "success", label: "Easy", iconClass: "fa-solid fa-face-smile", kind: "outline" },
};

export function RnwFlashCard({ word, memory, onRate, onOpenExamples, appliedTags = [] }: RnwFlashCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const canSpeak = useMemo(() => speechApplicationService.canSpeak(), []);

  useEffect(() => {
    return () => {
      speechApplicationService.stop();
    };
  }, []);

  async function handleRate(rating: Rating) {
    setShowAnswer(false);
    await onRate(rating);
  }

  function speakWord() {
    if (!canSpeak) return;
    speechApplicationService.speakEnglish(word.headword);
  }

  function speakExample(text: string) {
    if (!canSpeak || !text.trim()) return;
    speechApplicationService.speakEnglish(text.trim());
  }

  // Filtered entries (for front face + summary)
  const filteredEntries = appliedTags.length > 0
    ? word.entries.filter((e) =>
        e.meanings.some((m) => appliedTags.some((tag) => m.tags?.includes(tag)))
      )
    : word.entries;

  function getFilteredMeanings(entry: typeof word.entries[0]) {
    if (appliedTags.length === 0) return entry.meanings;
    return entry.meanings.filter((m) => appliedTags.some((tag) => m.tags?.includes(tag)));
  }

  const hasAnyExamples = word.entries.some((e) =>
    e.meanings.some((m) => (m.examples ?? []).length > 0)
  );

  return (
    <section style={cardStyle} data-testid="rnw-study-flash-card">
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <i className="fa-solid fa-layer-group" aria-hidden="true" style={{ color: "#0d6efd" }} />
          <strong>Flash Card</strong>
          <RnwLevelBadge level={memory.memoryLevel} />
        </div>

        <RnwButton
          title="Speak"
          onPress={speakWord}
          disabled={!canSpeak}
          icon={<i className="fa-solid fa-volume-high" aria-hidden="true" />}
          testID="rnw-study-speak-word"
          kind="outline"
          tone="primary"
          size="icon"
        />
      </header>

      <div style={bodyStyle}>
        {/* Front face */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 700 }}>{word.headword}</div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 4 }}>
            {filteredEntries.map((e) => (
              <RnwBadge key={e.pos} tone="secondary" variant="pill">{e.pos}</RnwBadge>
            ))}
          </div>
          <div style={{ color: "#6c757d", fontSize: 14 }}>
            due: {new Date(memory.dueAt).toLocaleString("en-US", {
              timeZone: "Asia/Tokyo",
              hour12: false,
            })}
          </div>
        </div>

        {!showAnswer ? (
          <RnwButton
            label="Show Answer"
            onPress={() => setShowAnswer(true)}
            fullWidth
            testID="rnw-study-show-answer"
            kind="solid"
            tone="primary"
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Summary: filtered meanings */}
            <div style={answerPanelStyle}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Meaning (JA)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {filteredEntries.map((entry) =>
                  getFilteredMeanings(entry).map((meaning, mi) => (
                    <div key={`${entry.pos}-${mi}`} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span>{meaning.meaningJa}</span>
                      {(meaning.tags ?? []).map((tag) => (
                        <span
                          key={tag}
                          style={{ fontSize: 11, backgroundColor: "#e9ecef", borderRadius: 4, padding: "1px 6px", color: "#6c757d" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Divider */}
            <hr style={{ margin: "4px 0", borderColor: "#dee2e6" }} />

            {/* Detail: all entries, all meanings */}
            <div style={answerPanelStyle}>
              {word.entries.map((entry) => (
                <div key={entry.pos} style={{ marginBottom: 16 }}>
                  {/* POS header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#0d6efd", letterSpacing: "0.05em" }}>
                      {entry.pos.toUpperCase()}
                    </span>
                    <hr style={{ flex: 1, margin: 0, borderColor: "#dee2e6" }} />
                  </div>

                  {entry.meanings.map((meaning, mi) => (
                    <div key={mi} style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{meaning.meaningJa}</div>
                      {(meaning.tags ?? []).length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                          {(meaning.tags ?? []).map((tag) => (
                            <span
                              key={tag}
                              style={{ fontSize: 11, backgroundColor: "#e9ecef", borderRadius: 4, padding: "1px 6px", color: "#6c757d" }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {(meaning.examples ?? []).map((example) => (
                          <div key={example.id} style={{ borderLeft: "3px solid #0d6efd", paddingLeft: 10 }}>
                            <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                              <div style={{ flex: 1 }}>{example.en}</div>
                              <RnwButton
                                title="Speak"
                                onPress={() => speakExample(example.en)}
                                disabled={!canSpeak}
                                icon={<i className="fa-solid fa-volume-high" aria-hidden="true" />}
                                kind="outline"
                                tone="secondary"
                                size="icon"
                              />
                            </div>
                            {example.ja ? <div style={{ color: "#6c757d", fontSize: 13 }}>{example.ja}</div> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <RnwButton
              type="button"
              kind="outline"
              tone="secondary"
              label="Practice in Examples"
              icon={<i className="fa-solid fa-language" aria-hidden="true" />}
              onPress={() => onOpenExamples(word.id)}
              fullWidth
              disabled={!hasAnyExamples}
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
              {(Object.keys(ratingPalette) as Rating[]).map((rating) => {
                const spec = ratingPalette[rating];
                return (
                  <RnwButton
                    key={rating}
                    label={spec.label}
                    onPress={() => void handleRate(rating)}
                    kind={spec.kind ?? "outline"}
                    tone={spec.tone}
                    fullWidth
                    icon={<i className={spec.iconClass} aria-hidden="true" />}
                    testID={`rnw-study-rate-${rating}`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
