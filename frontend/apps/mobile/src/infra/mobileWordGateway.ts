import type { WordGateway } from "../../../../src/core/word/wordGateway";
import type { AppData } from "../../../../src/api/types";
import type { MobileLearningRepositoryPort } from "../domain/mobileLearningRepository.types";

export function createMobileWordGateway(repository: MobileLearningRepositoryPort): WordGateway {
  return {
    async list(query) {
      return repository.listWords(query);
    },
    async get(wordId) {
      return repository.getWord(wordId);
    },
    async create(draft) {
      return repository.createWord(draft);
    },
    async update(wordId, draft) {
      return repository.updateWord(wordId, draft);
    },
    async delete(wordId) {
      repository.deleteWord(wordId);
    },
    async resetMemory(wordId) {
      repository.resetMemory(wordId);
    },
    async exportWords(): Promise<AppData> {
      const listed = repository.listWords({});
      return {
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        words: listed.words,
        memory: Object.values(listed.memoryMap),
      };
    },
    async getTags() {
      return repository.listTags();
    },
  };
}
