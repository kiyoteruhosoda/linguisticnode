import type { ExamplesGateway } from "../../../../src/core/examples/examplesGateway";
import type { ExampleTestItem } from "../../../../src/api/types";
import type { MobileLearningRepositoryPort } from "../domain/mobileLearningRepository.types";

export function createMobileExamplesGateway(repository: MobileLearningRepositoryPort): ExamplesGateway {
  return {
    async getTags() {
      return repository.listTags();
    },

    async next(tags, lastExampleId) {
      const result = repository.listWords({ tags: tags && tags.length > 0 ? tags : undefined });
      const items: ExampleTestItem[] = result.words.flatMap((word) =>
        (word.examples ?? []).map((ex) => ({
          id: ex.id,
          en: ex.en,
          ja: ex.ja,
          source: null,
          word: {
            id: word.id,
            headword: word.headword,
            pos: word.pos,
            meaningJa: word.meaningJa,
            tags: word.tags,
          },
        })),
      );

      if (items.length === 0) return null;

      if (lastExampleId) {
        const currentIdx = items.findIndex((it) => it.id === lastExampleId);
        const nextIdx = currentIdx + 1;
        if (nextIdx < items.length) {
          return items[nextIdx];
        }
        // wrap around
        return items[0];
      }

      return items[Math.floor(Math.random() * items.length)];
    },
  };
}
