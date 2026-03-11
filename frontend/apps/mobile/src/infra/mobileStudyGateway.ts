import type { StudyGateway } from "../../../../src/core/study/studyGateway";
import type { MobileLearningRepositoryPort } from "../domain/mobileLearningRepository.types";

export function createMobileStudyGateway(repository: MobileLearningRepositoryPort): StudyGateway {
  return {
    async getTags() {
      return repository.listTags();
    },
    async next(tags, preferredWordId) {
      if (preferredWordId) {
        const card = repository.getCard(preferredWordId);
        if (card) return card;
      }
      return repository.nextCard(tags);
    },
    async grade(wordId, rating) {
      return repository.gradeCard(wordId, rating);
    },
  };
}
