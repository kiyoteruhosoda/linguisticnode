import { WordApplicationService } from "../../../../src/core/word/wordApplicationService";
import { StudyApplicationService } from "../../../../src/core/study/studyApplicationService";
import { SyncApplicationService } from "../../../../src/core/sync/syncApplicationService";
import { ExamplesApplicationService } from "../../../../src/core/examples/examplesApplicationService";
import { MobileLearningRepository, PersistedMobileLearningRepository } from "../domain/mobileLearningRepository";
import type { MobileLearningRepositoryPort } from "../domain/mobileLearningRepository.types";
import { createMobileWordGateway } from "../infra/mobileWordGateway";
import { createMobileStudyGateway } from "../infra/mobileStudyGateway";
import { createMobileSyncGateway } from "../infra/mobileSyncGateway";
import { createMobileExamplesGateway } from "../infra/mobileExamplesGateway";
import { resolveMobileStorageAdapter } from "./mobileStorageRuntime";

export interface MobileCompositionRoot {
  wordService: WordApplicationService;
  studyService: StudyApplicationService;
  syncService: SyncApplicationService;
  examplesService: ExamplesApplicationService;
}

function readMobileSyncConfig() {
  return {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    accessToken: process.env.EXPO_PUBLIC_ACCESS_TOKEN,
    clientId: process.env.EXPO_PUBLIC_CLIENT_ID,
  };
}

async function createRepository(): Promise<MobileLearningRepositoryPort> {
  const { adapter } = await resolveMobileStorageAdapter();

  try {
    return await PersistedMobileLearningRepository.create(adapter);
  } catch {
    return new MobileLearningRepository();
  }
}

export async function createMobileCompositionRoot(): Promise<MobileCompositionRoot> {
  const repository = await createRepository();
  const syncConfig = readMobileSyncConfig();

  return {
    wordService: new WordApplicationService(createMobileWordGateway(repository)),
    studyService: new StudyApplicationService(createMobileStudyGateway(repository)),
    syncService: new SyncApplicationService(createMobileSyncGateway(repository, syncConfig)),
    examplesService: new ExamplesApplicationService(createMobileExamplesGateway(repository)),
  };
}
