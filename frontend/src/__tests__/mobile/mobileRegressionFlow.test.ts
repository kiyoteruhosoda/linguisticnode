import { afterEach, describe, expect, it, vi } from "vitest";
import { WordApplicationService } from "../../core/word/wordApplicationService";
import { StudyApplicationService } from "../../core/study/studyApplicationService";
import { SyncApplicationService } from "../../core/sync/syncApplicationService";
import { MobileLearningRepository } from "../../../apps/mobile/src/domain/mobileLearningRepository";
import { createMobileWordGateway } from "../../../apps/mobile/src/infra/mobileWordGateway";
import { createMobileStudyGateway } from "../../../apps/mobile/src/infra/mobileStudyGateway";
import { createMobileSyncGateway } from "../../../apps/mobile/src/infra/mobileSyncGateway";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mobile regression flow (create -> study -> sync)", () => {
  it("runs major use-cases end-to-end through application services", async () => {
    const repository = new MobileLearningRepository();

    const wordService = new WordApplicationService(createMobileWordGateway(repository));
    const studyService = new StudyApplicationService(createMobileStudyGateway(repository));
    const syncService = new SyncApplicationService(
      createMobileSyncGateway(repository, {
        apiBaseUrl: "http://localhost:8000",
        accessToken: "test-token",
        clientId: "mobile-regression-client",
      }),
    );

    const initialWords = await wordService.listWords({});

    const created = await wordService.createWord({
      headword: "portable",
      pronunciation: { notation: "ˈpɔːrtəbl" },
      entries: [{ pos: "adj", meanings: [{ meaningJa: "持ち運びできる", tags: ["mobile", "phase-e"], examples: [] }] }],
      memo: "mobile regression",
    });

    const listedAfterCreate = await wordService.listWords({ q: "portable" });
    expect(listedAfterCreate.items.some((word) => word.id === created.id)).toBe(true);

    const graded = await studyService.gradeCard(created.id, "good");
    expect(graded.wordId).toBe(created.id);
    expect(graded.reviewCount).toBeGreaterThanOrEqual(1);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        serverRev: 11,
        updatedAt: "2026-01-02T00:00:00.000Z",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const syncResult = await syncService.sync();
    expect(syncResult.status).toBe("success");
    if (syncResult.status === "success") {
      expect(syncResult.serverRev).toBe(11);
      expect(syncResult.updatedAt).toBe("2026-01-02T00:00:00.000Z");
    }

    const finalWords = await wordService.listWords({});
    expect(finalWords.items.length).toBe(initialWords.items.length + 1);
  });
});
