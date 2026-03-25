import type { ExampleSentence, Pos, PosEntry, WordEntry } from "../../api/types";

export type ExampleIdGenerator = {
  nextId: () => string;
};

type WordDraftFormState = {
  headword: string;
  pos: Pos;
  meaningJa: string;
  tagsInput: string;
  memo: string;
  examples: ExampleSentence[];
};

export function createEmptyExample(idGenerator: ExampleIdGenerator): ExampleSentence {
  return {
    id: idGenerator.nextId(),
    en: "",
    ja: null,
    source: null,
  };
}

export function normalizeExampleField(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}



export function parseTagsInput(tagsInput?: string): string[] {
  const normalized = (tagsInput ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(normalized));
}

export function sanitizeExamples(examples: ExampleSentence[]): ExampleSentence[] {
  return examples
    .map((example) => ({
      ...example,
      en: example.en.trim(),
      ja: normalizeExampleField(example.ja),
      source: normalizeExampleField(example.source),
    }))
    .filter((example) => example.en.length > 0);
}

/**
 * Get form initial values from the first entry/meaning of a word.
 * Forms edit the first entry and first meaning only.
 */
export function getFormInitialValues(initial: WordEntry | null | undefined): {
  pos: Pos;
  meaningJa: string;
  tagsInput: string;
  examples: ExampleSentence[];
} {
  const firstEntry = initial?.entries[0];
  const firstMeaning = firstEntry?.meanings[0];
  return {
    pos: firstEntry?.pos ?? "noun",
    meaningJa: firstMeaning?.meaningJa ?? "",
    tagsInput: (firstMeaning?.tags ?? []).join(", "),
    examples: (firstMeaning?.examples ?? []) as ExampleSentence[],
  };
}

export function buildWordSaveDraft(
  formState: WordDraftFormState,
  initial: WordEntry | null | undefined,
): Omit<WordEntry, "id" | "createdAt" | "updatedAt"> {
  const firstEntryInitial = initial?.entries[0];

  const entry: PosEntry = {
    pos: formState.pos,
    pronunciation: firstEntryInitial?.pronunciation,
    meanings: [
      {
        meaningJa: formState.meaningJa.trim(),
        tags: parseTagsInput(formState.tagsInput),
        examples: sanitizeExamples(formState.examples),
      },
    ],
  };

  // If initial had more than one entry, preserve the rest unchanged
  const remainingEntries: PosEntry[] = initial?.entries.slice(1) ?? [];

  return {
    headword: formState.headword.trim(),
    pronunciation: initial?.pronunciation,
    entries: [entry, ...remainingEntries],
    memo: normalizeExampleField(formState.memo),
  };
}
