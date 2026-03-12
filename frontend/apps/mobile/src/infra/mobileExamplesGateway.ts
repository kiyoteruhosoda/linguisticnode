import type { ExamplesGateway } from "../../../../src/core/examples/examplesGateway";
import type { ExampleTestItem } from "../../../../src/api/types";
import type { MobileLearningRepositoryPort } from "../domain/mobileLearningRepository.types";
import { filterByPreferredWord, selectNextExample } from "../domain/exampleNavigationPolicy";

export function createMobileExamplesGateway(
  repository: MobileLearningRepositoryPort,
  random: () => number = Math.random,
): ExamplesGateway {
  return {
    async getTags() {
      return repository.listTags();
    },

    async next(tags, lastExampleId, preferredWordId) {
      const result = repository.listWords({ tags: tags && tags.length > 0 ? tags : undefined });
      let items: ExampleTestItem[] = result.words.flatMap((word) =>
        (word.examples ?? []).map((ex) => ({
          id: ex.id,
          en: ex.en,
          ja: ex.ja,
          source: null,
          word: {
            id: word.id,
            headword: word.headword,
            pronunciation: word.pronunciation,
            pos: word.pos,
            meaningJa: word.meaningJa,
            tags: word.tags,
          },
        })),
      );

      if (preferredWordId) {
        items = filterByPreferredWord(items, preferredWordId);
      }

      return selectNextExample(items, lastExampleId, random);
    },
  };
}
