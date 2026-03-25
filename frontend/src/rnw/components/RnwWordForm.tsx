// frontend/src/rnw/components/RnwWordForm.tsx

import { useEffect, useMemo, useState } from "react";
import type { ExampleSentence, Pos, WordEntry } from "../../api/types";
import { buildWordSaveDraft, createEmptyExample, getFormInitialValues } from "../../core/word/wordDraftPolicy";
import { createUuidGenerator } from "../../core/identity/uuid";
import { speechApplicationService } from "../../speech/speechApplication";
import { RnwButton } from "./RnwButton";

const POS: Pos[] = ["noun", "verb", "adj", "adv", "prep", "conj", "pron", "det", "interj", "other"];

export type RnwWordFormProps = {
  initial?: WordEntry | null;
  onSave: (draft: Omit<WordEntry, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onCancel?: () => void;
};

const sectionStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 12,
};

const textInputStyle = {
  width: "100%",
  border: "1px solid #ced4da",
  borderRadius: 6,
  padding: "8px 10px",
};

export function RnwWordForm({ initial, onSave, onCancel }: RnwWordFormProps) {
  const idGenerator = useMemo(() => createUuidGenerator(), []);

  const initValues = useMemo(() => getFormInitialValues(initial), [initial]);

  const [headword, setHeadword] = useState(initial?.headword ?? "");
  const [pos, setPos] = useState<Pos>(initValues.pos);
  const [meaningJa, setMeaningJa] = useState(initValues.meaningJa);
  const [tagsInput, setTagsInput] = useState(initValues.tagsInput);
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [examples, setExamples] = useState<ExampleSentence[]>(
    initValues.examples.length > 0 ? initValues.examples : [createEmptyExample(idGenerator)],
  );
  const [busy, setBusy] = useState(false);

  const canSpeak = useMemo(() => speechApplicationService.canSpeak(), []);

  useEffect(() => {
    if (!initial) return;
    const vals = getFormInitialValues(initial);
    setHeadword(initial.headword);
    setPos(vals.pos);
    setMeaningJa(vals.meaningJa);
    setTagsInput(vals.tagsInput);
    setMemo(initial.memo ?? "");
    setExamples(vals.examples.length > 0 ? vals.examples : [createEmptyExample(idGenerator)]);
  }, [idGenerator, initial]);

  function addExample() {
    setExamples((prev) => [...prev, createEmptyExample(idGenerator)]);
  }

  function updateExample(id: string, field: keyof ExampleSentence, value: string) {
    setExamples((prev) => prev.map((example) => (example.id === id ? { ...example, [field]: value || null } : example)));
  }

  function removeExample(id: string) {
    setExamples((prev) => prev.filter((example) => example.id !== id));
  }

  function speak(text: string) {
    if (!canSpeak || !text.trim()) return;
    speechApplicationService.speakEnglish(text.trim());
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSave(buildWordSaveDraft({ headword, pos, meaningJa, tagsInput, memo, examples }, initial));
      if (!initial) {
        setHeadword("");
        setPos("noun");
        setMeaningJa("");
        setTagsInput("");
        setMemo("");
        setExamples([createEmptyExample(idGenerator)]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="rnw-word-form">
      <section style={sectionStyle}>
        <h5 style={{ margin: 0 }}>{initial ? "Edit word" : "Add a new word"}</h5>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span>Word</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
              <input
                value={headword}
                onChange={(event) => setHeadword(event.target.value)}
                required
                style={textInputStyle}
                data-testid="rnw-word-form-headword"
              />
              <RnwButton
                title="Speak"
                onPress={() => speak(headword)}
                disabled={!canSpeak || !headword.trim()}
                icon={<i className="fa-solid fa-volume-high" aria-hidden="true" />}
                kind="outline"
                tone="secondary"
              />
            </div>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span>POS</span>
            <select
              value={pos}
              onChange={(event) => setPos(event.target.value as Pos)}
              style={{ ...textInputStyle, minWidth: 110 }}
            >
              {POS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span>Meaning (JA)</span>
            <input
              value={meaningJa}
              onChange={(event) => setMeaningJa(event.target.value)}
              required
              style={textInputStyle}
              data-testid="rnw-word-form-meaning"
            />
          </label>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Tags (comma separated)</span>
          <input
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            placeholder="e.g. business, travel"
            style={textInputStyle}
            data-testid="rnw-word-form-tags"
          />
        </label>
      </section>

      <section style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <strong>Example Sentences</strong>
          <RnwButton
            label="Add Example"
            onPress={addExample}
            icon={<i className="fa-solid fa-plus" aria-hidden="true" />}
            testID="rnw-word-form-add-example"
            kind="outline"
            tone="primary"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {examples.map((example) => (
            <div key={example.id} style={{ border: "1px solid #dee2e6", borderRadius: 8, backgroundColor: "#f8f9fa", padding: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span>English</span>
                  <input
                    value={example.en}
                    onChange={(event) => updateExample(example.id, "en", event.target.value)}
                    placeholder="English sentence"
                    style={textInputStyle}
                  />
                </label>
                <RnwButton
                  title="Speak"
                  onPress={() => speak(example.en || "")}
                  disabled={!canSpeak || !example.en?.trim()}
                  icon={<i className="fa-solid fa-volume-high" aria-hidden="true" />}
                  kind="outline"
                  tone="secondary"
                />
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                <span>Japanese (optional)</span>
                <input
                  value={example.ja ?? ""}
                  onChange={(event) => updateExample(example.id, "ja", event.target.value)}
                  placeholder="Japanese translation"
                  style={textInputStyle}
                />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <RnwButton
                  label="Remove"
                  onPress={() => removeExample(example.id)}
                  icon={<i className="fa-solid fa-trash" aria-hidden="true" />}
                  testID="rnw-remove-button"
                  kind="outline"
                  tone="danger"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Memo (optional)</span>
          <textarea
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            rows={4}
            style={{ ...textInputStyle, resize: "vertical" as const }}
          />
        </label>
      </section>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
        <RnwButton
          label={busy ? "Saving..." : initial ? "Update" : "Create Word"}
          type="submit"
          disabled={busy}
          icon={<i className={initial ? "fa-solid fa-pen" : "fa-solid fa-plus"} aria-hidden="true" />}
          testID="rnw-submit-button"
          kind="solid"
          tone="primary"
        />
        {onCancel ? (
          <RnwButton
            label="Cancel"
            onPress={onCancel}
            icon={<i className="fa-solid fa-xmark" aria-hidden="true" />}
            disabled={busy}
            kind="outline"
            tone="secondary"
          />
        ) : null}
      </div>
    </form>
  );
}
