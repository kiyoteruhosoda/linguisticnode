// frontend/src/api/examples.offline.ts

/**
 * Offline-first examples test API
 *
 * All operations use local IndexedDB repository
 */

import type { NextExampleResponse, ExampleTestItem } from "./types";
import * as localRepo from "../db/localRepository";

export const examplesApi = {
  /**
   * Get random example sentence for testing (offline)
   * @param tags - Filter by tags
   * @param lastExampleId - Avoid returning this example ID (unless it's the only one)
   */
  async next(tags?: string[], lastExampleId?: string | null, preferredWordId?: string | null): Promise<NextExampleResponse> {
    const result = await localRepo.getWords({ tags: tags && tags.length > 0 ? tags : undefined });
    const words = result.words;

    // Collect all examples from all words via entries
    const examplesPool: Array<{ word: typeof words[0]; example: { id: string; en: string; ja?: string | null; source?: string | null }; pos: string; meaningJa: string; wordTags: string[] }> = [];
    for (const word of words) {
      for (const entry of word.entries) {
        for (const meaning of entry.meanings) {
          for (const example of (meaning.examples ?? [])) {
            examplesPool.push({
              word,
              example,
              pos: entry.pos,
              meaningJa: meaning.meaningJa,
              wordTags: meaning.tags ?? [],
            });
          }
        }
      }
    }

    if (examplesPool.length === 0) {
      return { example: null };
    }

    if (preferredWordId) {
      const preferredExamples = examplesPool.filter(item => item.word.id === preferredWordId);
      if (preferredExamples.length > 0) {
        examplesPool.splice(0, examplesPool.length, ...preferredExamples);
      }
    }

    // Filter out last example if there are alternatives
    let availableExamples = examplesPool;
    if (lastExampleId && examplesPool.length > 1) {
      const withoutLast = examplesPool.filter(item => item.example.id !== lastExampleId);
      if (withoutLast.length > 0) {
        availableExamples = withoutLast;
      }
    }

    // Pick random example
    const randomIndex = Math.floor(Math.random() * availableExamples.length);
    const selected = availableExamples[randomIndex];

    const testItem: ExampleTestItem = {
      id: selected.example.id,
      en: selected.example.en,
      ja: selected.example.ja,
      source: selected.example.source,
      word: {
        id: selected.word.id,
        headword: selected.word.headword,
        pronunciation: selected.word.pronunciation?.notation ?? null,
        pos: selected.pos as ExampleTestItem["word"]["pos"],
        meaningJa: selected.meaningJa,
        tags: selected.wordTags,
      }
    };

    return { example: testItem };
  },

  /**
   * Get all tags from words that have examples (offline)
   */
  async getTags(): Promise<{ tags: string[] }> {
    const result = await localRepo.getWords();
    const words = result.words;

    const tagsSet = new Set<string>();
    for (const word of words) {
      for (const entry of word.entries) {
        for (const meaning of entry.meanings) {
          if ((meaning.examples ?? []).length > 0) {
            for (const tag of (meaning.tags ?? [])) {
              tagsSet.add(tag);
            }
          }
        }
      }
    }

    return { tags: Array.from(tagsSet).sort() };
  }
};
