import type { AppData, AppDataForImport } from "../../../../src/api/types";
import type { MobileLearningRepositoryPort } from "../domain/mobileLearningRepository.types";
import { normalizeVocabFileForImport } from "../domain/vocabFileNormalizer";

export interface MobileIoGateway {
  exportData(): AppData;
  importData(raw: AppDataForImport, mode: "merge" | "overwrite"): void;
}

export function createMobileIoGateway(repository: MobileLearningRepositoryPort): MobileIoGateway {
  return {
    exportData(): AppData {
      const file = repository.exportVocabFile();
      return {
        schemaVersion: file.schemaVersion,
        exportedAt: new Date().toISOString(),
        words: file.words,
        memory: file.memory,
      };
    },

    importData(raw: AppDataForImport, mode: "merge" | "overwrite"): void {
      if (!raw.words || !Array.isArray(raw.words)) {
        throw new Error("Invalid import data: 'words' must be an array");
      }
      const vocabFile = normalizeVocabFileForImport(raw);
      repository.importVocabFile(vocabFile, mode);
    },
  };
}
